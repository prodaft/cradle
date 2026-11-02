"""Views for teams: team CRUD, membership, team entity access and entity ownership.

Visibility: admins and managers see every team; other users see the teams they belong to.
Changes: admins create, delete and assign leads; admins and the team's leads edit the team and
its members; who may change a team's entity access is decided by ``teams.rules``.
"""

from typing import cast
from uuid import UUID

from django.db import IntegrityError, transaction
from django.db.models import Count
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.generics import ListAPIView, ListCreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from access.enums import AccessType
from core.exceptions import CoreErrorCodes, PermissionDeniedException
from core.openapi import get_common_error_responses, get_error_responses
from core.pagination import TotalPagesPagination
from core.query_lang import search_q
from entries.exceptions import EntriesErrorCodes
from entries.lookup import get_entity
from entries.models import EntryClass
from notifications.models import TeamMembershipNotification
from user.authentication import CookieJWTAuthentication
from user.exceptions import UserErrorCodes, UserNotFoundException
from user.models import CradleUser
from user.permissions import HasAdminRole

from .enums import TeamRole
from .exceptions import (
    DuplicateTeamException,
    TeamAccessChangeNotAllowedException,
    TeamChangeNotAllowedException,
    TeamErrorCodes,
    TeamMemberAlreadyExistsException,
    TeamMemberNotFoundException,
    TeamReservesEntryTypesException,
)
from .lookup import get_managed_team, get_visible_team
from .models import Team, TeamAccess, TeamMembership
from .permissions import CanViewEntityAccess
from .rules import can_set_team_access
from .serializers import (
    EntityOwnerSerializer,
    EntityTeamAccessSerializer,
    TeamAccessSerializer,
    TeamAccessUpdateSerializer,
    TeamCandidateSerializer,
    TeamMemberAddSerializer,
    TeamMemberSerializer,
    TeamMemberUpdateSerializer,
    TeamSerializer,
    UserTeamMembershipSerializer,
)

PAGE_PARAMS = [
    OpenApiParameter(name="page", type=int, location=OpenApiParameter.QUERY, description="Page number", required=False),
    OpenApiParameter(
        name="page_size", type=int, location=OpenApiParameter.QUERY, description="Page size", required=False
    ),
]
PAGE_ERRORS = (CoreErrorCodes.INVALID_PAGE_SIZE, CoreErrorCodes.PAGE_SIZE_TOO_LARGE)


@extend_schema_view(
    get=extend_schema(
        operation_id="teams_list",
        summary="List teams",
        description=(
            "Returns teams visible to the requester: all teams for admins and managers, otherwise the "
            "teams the requester belongs to. Use mine=true to list only the requester's teams."
        ),
        parameters=[
            *PAGE_PARAMS,
            OpenApiParameter(
                name="mine",
                type=bool,
                location=OpenApiParameter.QUERY,
                description="Only teams the requester belongs to",
                required=False,
            ),
            OpenApiParameter(
                name="search",
                type=str,
                location=OpenApiParameter.QUERY,
                description='Search by team name. Supports AND/OR/NOT, -term, "phrases", =exact and * wildcards.',
                required=False,
            ),
        ],
        responses={
            200: TotalPagesPagination().get_paginated_response_serializer(TeamSerializer),
            **get_error_responses(*PAGE_ERRORS),
            **get_common_error_responses(),
        },
    ),
    post=extend_schema(
        operation_id="teams_create",
        summary="Create team",
        description="Creates a team. Only available to admins.",
        request=TeamSerializer,
        responses={
            201: TeamSerializer,
            **get_error_responses(
                TeamErrorCodes.DUPLICATE_TEAM, CoreErrorCodes.PERMISSION_DENIED, include_validation_error=True
            ),
            **get_common_error_responses(),
        },
    ),
)
class TeamList(ListCreateAPIView):
    """List visible teams or create a team (admin)."""

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = TeamSerializer
    pagination_class = TotalPagesPagination

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Team.objects.none()
        user = cast(CradleUser, self.request.user)
        teams = Team.objects.visible_to(user).with_member_info(user)
        if self.request.query_params.get("mine") in ("true", "1"):
            teams = teams.member_of(user)
        q = search_q(self.request.query_params.get("search"), ["name"])
        if q is not None:
            teams = teams.filter(q)
        return teams.order_by("name")

    def create(self, request: Request, *args, **kwargs) -> Response:
        user = cast(CradleUser, request.user)
        if not user.is_admin:
            raise PermissionDeniedException(detail="Only administrators can create teams.")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                team = serializer.save(created_by=user)
                team.log_create(user)
        except IntegrityError:
            raise DuplicateTeamException(detail="A team with this name already exists.")
        return Response(self.get_serializer(team).data, status=status.HTTP_201_CREATED)


@extend_schema_view(
    get=extend_schema(
        operation_id="teams_retrieve",
        summary="Get team",
        description="Returns a team visible to the requester.",
        responses={
            200: TeamSerializer,
            **get_error_responses(TeamErrorCodes.TEAM_NOT_FOUND),
            **get_common_error_responses(),
        },
    ),
    patch=extend_schema(
        operation_id="teams_update",
        summary="Update team",
        description="Updates a team's name or description. Available to admins and the team's leads.",
        request=TeamSerializer,
        responses={
            200: TeamSerializer,
            **get_error_responses(
                TeamErrorCodes.TEAM_NOT_FOUND,
                TeamErrorCodes.TEAM_CHANGE_NOT_ALLOWED,
                TeamErrorCodes.DUPLICATE_TEAM,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    ),
    delete=extend_schema(
        operation_id="teams_destroy",
        summary="Delete team",
        description=(
            "Deletes a team, its memberships and its entity access. Entities it owned become unowned. "
            "Direct user grants are kept. Refused while the team is the only one an entity type is reserved for. "
            "Only available to admins."
        ),
        responses={
            204: {"description": "Team deleted"},
            **get_error_responses(
                TeamErrorCodes.TEAM_NOT_FOUND,
                TeamErrorCodes.TEAM_RESERVES_ENTRY_TYPES,
                CoreErrorCodes.PERMISSION_DENIED,
            ),
            **get_common_error_responses(),
        },
    ),
)
class TeamDetail(APIView):
    """Retrieve, update or delete a team."""

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = TeamSerializer

    def get(self, request: Request, team_id: UUID) -> Response:
        team = get_visible_team(cast(CradleUser, request.user), team_id)
        return Response(TeamSerializer(team, context={"request": request}).data)

    def patch(self, request: Request, team_id: UUID) -> Response:
        user = cast(CradleUser, request.user)
        team = get_managed_team(user, team_id)
        serializer = TeamSerializer(team, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                serializer.save()
                team.log_edit(user)
        except IntegrityError:
            raise DuplicateTeamException(detail="A team with this name already exists.")
        return Response(serializer.data)

    def delete(self, request: Request, team_id: UUID) -> Response:
        user = cast(CradleUser, request.user)
        team = get_visible_team(user, team_id)
        if not user.is_admin:
            raise PermissionDeniedException(detail="Only administrators can delete teams.")
        reserved = list(
            EntryClass.objects.filter(pk__in=team.entry_classes.values("pk"))
            .annotate(num_teams=Count("teams"))
            .filter(num_teams=1)
            .values_list("subtype", flat=True)
        )
        if reserved:
            raise TeamReservesEntryTypesException(
                detail=f"This team is the only one these entity types are reserved for: {', '.join(reserved)}. "
                "Change their teams first."
            )
        with transaction.atomic():
            team.log_delete(user, details=team.name)
            team.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(
    get=extend_schema(
        operation_id="teams_members_list",
        summary="List team members",
        description="Returns the members of a team visible to the requester, leads first.",
        parameters=[
            *PAGE_PARAMS,
            OpenApiParameter(
                name="search",
                type=str,
                location=OpenApiParameter.QUERY,
                description='Search members by username. Supports AND/OR/NOT, -term, "phrases", =exact and * wildcards.',
                required=False,
            ),
        ],
        responses={
            200: TotalPagesPagination().get_paginated_response_serializer(TeamMemberSerializer),
            **get_error_responses(TeamErrorCodes.TEAM_NOT_FOUND, *PAGE_ERRORS),
            **get_common_error_responses(),
        },
    ),
    post=extend_schema(
        operation_id="teams_members_create",
        summary="Add team member",
        description=(
            "Adds a user to a team and notifies them. Admins and the team's leads can add members; only admins "
            "can add leads."
        ),
        request=TeamMemberAddSerializer,
        responses={
            201: TeamMemberSerializer,
            **get_error_responses(
                TeamErrorCodes.TEAM_NOT_FOUND,
                TeamErrorCodes.TEAM_CHANGE_NOT_ALLOWED,
                TeamErrorCodes.TEAM_MEMBER_ALREADY_EXISTS,
                UserErrorCodes.USER_NOT_FOUND,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    ),
)
class TeamMemberList(ListCreateAPIView):
    """List or add team members."""

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = TeamMemberSerializer
    pagination_class = TotalPagesPagination

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return TeamMembership.objects.none()
        team = get_visible_team(cast(CradleUser, self.request.user), self.kwargs["team_id"])
        members = team.memberships.select_related("user")
        q = search_q(self.request.query_params.get("search"), ["user__username"])
        if q is not None:
            members = members.filter(q)
        return members.order_by("role", "user__username")

    def create(self, request: Request, team_id: UUID, *args, **kwargs) -> Response:
        user = cast(CradleUser, request.user)
        team = get_managed_team(user, team_id)

        body = TeamMemberAddSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        role = body.validated_data["role"]
        try:
            member = CradleUser.objects.get(pk=body.validated_data["user_id"])
        except CradleUser.DoesNotExist:
            raise UserNotFoundException(detail="That user could not be found.")
        if member.is_admin:
            raise TeamChangeNotAllowedException(detail="Administrators already have access to everything.")

        if role == TeamRole.LEAD and not user.is_admin:
            raise TeamChangeNotAllowedException(detail="Only administrators can assign team leads.")

        try:
            with transaction.atomic():
                membership = TeamMembership.objects.create(team=team, user=member, role=role)
                team.log_edit(user, details=f"added {member.username} as {role}")
                TeamMembershipNotification.objects.create(
                    user=member, team=team, message=f'You were added to team "{team.name}" as {role}.'
                )
        except IntegrityError:
            raise TeamMemberAlreadyExistsException(detail="That user is already a member of this team.")

        return Response(TeamMemberSerializer(membership).data, status=status.HTTP_201_CREATED)


@extend_schema_view(
    get=extend_schema(
        operation_id="teams_member_candidates_list",
        summary="List users who can be added to a team",
        description=(
            "Returns non-admin users who are not yet members of the team. Available to admins and the team's leads."
        ),
        parameters=[
            *PAGE_PARAMS,
            OpenApiParameter(
                name="search",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Search users by username",
                required=False,
            ),
        ],
        responses={
            200: TotalPagesPagination().get_paginated_response_serializer(TeamCandidateSerializer),
            **get_error_responses(TeamErrorCodes.TEAM_NOT_FOUND, TeamErrorCodes.TEAM_CHANGE_NOT_ALLOWED, *PAGE_ERRORS),
            **get_common_error_responses(),
        },
    ),
)
class TeamMemberCandidates(ListAPIView):
    """Users a team's managers can add (user listing is otherwise admin-only)."""

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = TeamCandidateSerializer
    pagination_class = TotalPagesPagination

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return CradleUser.objects.none()
        user = cast(CradleUser, self.request.user)
        team = get_managed_team(user, self.kwargs["team_id"])
        users = CradleUser.objects.non_admins().exclude(team_memberships__team=team)
        q = search_q(self.request.query_params.get("search"), ["username"])
        if q is not None:
            users = users.filter(q)
        return users.order_by("username")


@extend_schema_view(
    patch=extend_schema(
        operation_id="teams_members_update",
        summary="Change team member role",
        description="Changes a member's role. Only available to admins.",
        request=TeamMemberUpdateSerializer,
        responses={
            200: TeamMemberSerializer,
            **get_error_responses(
                TeamErrorCodes.TEAM_NOT_FOUND,
                TeamErrorCodes.TEAM_MEMBER_NOT_FOUND,
                TeamErrorCodes.TEAM_CHANGE_NOT_ALLOWED,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    ),
    delete=extend_schema(
        operation_id="teams_members_destroy",
        summary="Remove team member",
        description=(
            "Removes a user from a team. Admins can remove anyone, leads can remove members, and any member "
            "can leave. The user's direct grants are kept."
        ),
        responses={
            204: {"description": "Member removed"},
            **get_error_responses(
                TeamErrorCodes.TEAM_NOT_FOUND,
                TeamErrorCodes.TEAM_MEMBER_NOT_FOUND,
                TeamErrorCodes.TEAM_CHANGE_NOT_ALLOWED,
            ),
            **get_common_error_responses(),
        },
    ),
)
class TeamMemberDetail(APIView):
    """Change a member's role or remove them from a team."""

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = TeamMemberUpdateSerializer

    def _membership(self, team: Team, user_id: UUID) -> TeamMembership:
        try:
            return team.memberships.select_related("user").get(user_id=user_id)
        except TeamMembership.DoesNotExist:
            raise TeamMemberNotFoundException(detail="That user is not a member of this team.")

    def patch(self, request: Request, team_id: UUID, user_id: UUID) -> Response:
        user = cast(CradleUser, request.user)
        team = get_visible_team(user, team_id)
        if not user.is_admin:
            raise TeamChangeNotAllowedException(detail="Only administrators can change team roles.")
        membership = self._membership(team, user_id)

        body = TeamMemberUpdateSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        role = body.validated_data["role"]

        if role != membership.role:
            with transaction.atomic():
                membership.role = role
                membership.save(update_fields=["role"])
                team.log_edit(user, details=f"made {membership.user.username} {role}")
                TeamMembershipNotification.objects.create(
                    user=membership.user, team=team, message=f'Your role in team "{team.name}" is now {role}.'
                )
        return Response(TeamMemberSerializer(membership).data)

    def delete(self, request: Request, team_id: UUID, user_id: UUID) -> Response:
        user = cast(CradleUser, request.user)
        team = get_visible_team(user, team_id)
        membership = self._membership(team, user_id)

        leaving = membership.user_id == user.pk
        if not (user.is_admin or leaving):
            if not team.can_manage(user):
                raise TeamChangeNotAllowedException(detail="Only admins and the team's leads can change this team.")
            if membership.role == TeamRole.LEAD:
                raise TeamChangeNotAllowedException(detail="Only administrators can remove team leads.")

        with transaction.atomic():
            membership.delete()
            team.log_edit(user, details=f"removed {membership.user.username}")
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(
    get=extend_schema(
        operation_id="users_teams_list",
        summary="List a user's teams",
        description="Returns every team a user belongs to, with their role in it. Only available to admins.",
        responses={
            200: UserTeamMembershipSerializer(many=True),
            **get_error_responses(UserErrorCodes.USER_NOT_FOUND),
            **get_common_error_responses(),
        },
    ),
)
class UserTeamList(APIView):
    """List the teams a user belongs to (admin)."""

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated, HasAdminRole]

    def get(self, request: Request, user_id: UUID) -> Response:
        if not CradleUser.objects.filter(pk=user_id).exists():
            raise UserNotFoundException(detail="That user could not be found.")
        memberships = TeamMembership.objects.filter(user_id=user_id).select_related("team").order_by("team__name")
        return Response(UserTeamMembershipSerializer(memberships, many=True).data)


@extend_schema_view(
    get=extend_schema(
        operation_id="users_me_teams_list",
        summary="List my teams",
        description="Returns every team the authenticated user belongs to, with their role in it.",
        responses={
            200: UserTeamMembershipSerializer(many=True),
            **get_common_error_responses(),
        },
    ),
)
class UserMeTeamList(APIView):
    """List the teams the requesting user belongs to."""

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        memberships = TeamMembership.objects.filter(user=request.user).select_related("team").order_by("team__name")
        return Response(UserTeamMembershipSerializer(memberships, many=True).data)


@extend_schema_view(
    get=extend_schema(
        operation_id="teams_access_list",
        summary="List team entity access",
        description="Returns the entities a team visible to the requester can access.",
        parameters=[
            *PAGE_PARAMS,
            OpenApiParameter(
                name="search",
                type=str,
                location=OpenApiParameter.QUERY,
                description='Search entities by name. Supports AND/OR/NOT, -term, "phrases", =exact and * wildcards.',
                required=False,
            ),
        ],
        responses={
            200: TotalPagesPagination().get_paginated_response_serializer(TeamAccessSerializer),
            **get_error_responses(TeamErrorCodes.TEAM_NOT_FOUND, *PAGE_ERRORS),
            **get_common_error_responses(),
        },
    ),
)
class TeamAccessList(ListAPIView):
    """List a team's entity access."""

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = TeamAccessSerializer
    pagination_class = TotalPagesPagination

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return TeamAccess.objects.none()
        team = get_visible_team(cast(CradleUser, self.request.user), self.kwargs["team_id"])
        accesses = team.accesses.select_related("entity", "entity__entry_class")
        q = search_q(self.request.query_params.get("search"), ["entity__name"])
        if q is not None:
            accesses = accesses.filter(q)
        return accesses.order_by("entity__name")


@extend_schema_view(
    put=extend_schema(
        operation_id="entities_access_teams_update",
        summary="Set team access to entity",
        description=(
            "Sets a team's access to an entity; none removes it. The owning team's read-write access cannot be "
            "lowered. For an entity with an owning team, only that "
            "team's leads can do this; otherwise the target team's leads can. Leads cannot grant more than "
            "their own access to the entity. Admins can always do this."
        ),
        request=TeamAccessUpdateSerializer,
        responses={
            200: TeamAccessUpdateSerializer,
            **get_error_responses(
                TeamErrorCodes.TEAM_NOT_FOUND,
                EntriesErrorCodes.ENTITY_NOT_FOUND,
                TeamErrorCodes.TEAM_ACCESS_CHANGE_NOT_ALLOWED,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    ),
)
class TeamAccessUpdate(APIView):
    """Set a team's access to one entity."""

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = TeamAccessUpdateSerializer

    def put(self, request: Request, team_id: UUID, entity_id: int) -> Response:
        user = cast(CradleUser, request.user)
        team = get_visible_team(user, team_id)
        entity = get_entity(entity_id)

        body = TeamAccessUpdateSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        access_type = body.validated_data["access_type"]

        if not can_set_team_access(user, team, entity, access_type):
            raise TeamAccessChangeNotAllowedException(
                detail="You do not have permission to change this team's access to this entity."
            )
        if entity.team_id == team.id and access_type != AccessType.READ_WRITE:
            raise TeamAccessChangeNotAllowedException(
                detail="The owning team always has read-write access. Change the entity's owning team first."
            )

        with transaction.atomic():
            if access_type == AccessType.NONE:
                TeamAccess.objects.filter(team=team, entity=entity).delete()
            else:
                TeamAccess.objects.update_or_create(team=team, entity=entity, defaults={"access_type": access_type})
            team.log_edit(user, details=f"set access to {entity.name} to {access_type}")

        return Response({"access_type": access_type})


@extend_schema_view(
    get=extend_schema(
        operation_id="entities_access_teams_list",
        summary="List teams with access to entity",
        description=(
            "Returns every team that can access an entity. Available to managers and the leads of the "
            "entity's owning team."
        ),
        responses={
            200: EntityTeamAccessSerializer(many=True),
            **get_error_responses(EntriesErrorCodes.ENTITY_NOT_FOUND),
            **get_common_error_responses(),
        },
    ),
)
class EntityTeamAccessList(APIView):
    """List the teams with access to an entity."""

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated, CanViewEntityAccess]

    def get(self, request: Request, entity_id: int) -> Response:
        entity = get_entity(entity_id)
        accesses = entity.team_accesses.select_related("team", "entity").order_by("team__name")
        return Response(EntityTeamAccessSerializer(accesses, many=True).data)


@extend_schema_view(
    put=extend_schema(
        operation_id="entities_owner_update",
        summary="Set entity owning team",
        description=(
            "Sets or clears the team that owns an entity. The owning team is given read-write access. "
            "Only available to admins."
        ),
        request=EntityOwnerSerializer,
        responses={
            200: EntityOwnerSerializer,
            **get_error_responses(
                EntriesErrorCodes.ENTITY_NOT_FOUND,
                TeamErrorCodes.TEAM_NOT_FOUND,
                CoreErrorCodes.PERMISSION_DENIED,
                include_validation_error=True,
            ),
            **get_common_error_responses(),
        },
    ),
)
class EntityOwner(APIView):
    """Set an entity's owning team (admin)."""

    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = EntityOwnerSerializer

    def put(self, request: Request, entity_id: int) -> Response:
        user = cast(CradleUser, request.user)
        if not user.is_admin:
            raise PermissionDeniedException(detail="Only administrators can change an entity's owning team.")
        entity = get_entity(entity_id)

        body = EntityOwnerSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        team_id = body.validated_data["team_id"]
        team = get_visible_team(user, team_id) if team_id else None

        with transaction.atomic():
            if team is None:
                entity.team = None
                entity.save(update_fields=["team"])
            else:
                team.take_ownership(entity)
            entity.log_edit(user, details=f"owning team set to {team.name if team else 'none'}")

        return Response({"team_id": team_id})
