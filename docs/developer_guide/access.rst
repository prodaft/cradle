Overview of the Access Control
===============================

The access control policy determines the entities and notes a user has access to. CRADLE's access control policy is determined on a case-level basis.

A User can have three types of access on a case:
- **NONE**: the user does not see any notes which reference the case and cannot create any note which references the case.
- **READ**: the user can see the notes which reference the case, but cannot create any note which references the case.
- **READ-WRITE**: the user can see the notes which reference the case and can create any note which references the case.

From these access types, the following rule is then used to determine whether a user can have access to a note:
A user can see the content of a note if and only if they have access to all the cases referenced by the note.

Determining the Access Type of a User on a Case
-----------------------------------------------

The access of a User is stored in the database through the Access model. The model is defined as follows:

.. code-block:: python

    class Access(models.Model):
        id: models.UUIDField = models.UUIDField(
            primary_key=True, default=uuid.uuid4, editable=False
        )
        user: models.ForeignKey = models.ForeignKey(
            CradleUser, on_delete=models.CASCADE, to_field="id"
        )
        case: models.ForeignKey = models.ForeignKey(
            Entity, on_delete=models.CASCADE, to_field="id", null=True
        )
        access_type: models.CharField = models.CharField(
            max_length=20, choices=AccessType.choices, default=AccessType.NONE
        )
        objects = AccessManager()

        def __str__(self):
            return str(self.case) + " " + self.access_type

        class Meta:
            constraints = [
                models.UniqueConstraint(
                    fields=["user", "case"], name="unique_user_id_case_id"
                )
            ]

In general, the access control of the user on the case can be determined by checking the column in the database with the corresponding user id and case id. However, there are two exceptions to this rule:

1. Superusers should have no entries in the database, but should have by default READ-WRITE access to all cases.
2. If a column does not exist in the database, the user will by default have NONE access to that case.

There are a number of utility functions in the access app of the application which can be used to determine the access type and the accessible cases. For retrieving accessible notes, one can check methods in the notes app.
