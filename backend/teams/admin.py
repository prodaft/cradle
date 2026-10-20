"""Django admin configuration for the teams app."""

from django.contrib import admin

from .models import Team, TeamAccess, TeamMembership


class TeamMembershipInline(admin.TabularInline):
    model = TeamMembership
    extra = 0
    autocomplete_fields = ("user",)


class TeamAccessInline(admin.TabularInline):
    model = TeamAccess
    extra = 0
    raw_id_fields = ("entity",)


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    """Admin for teams with their members and entity access inline."""

    list_display = ("name", "created_by", "created_at")
    search_fields = ("name",)
    readonly_fields = ("id", "created_at")
    inlines = (TeamMembershipInline, TeamAccessInline)
