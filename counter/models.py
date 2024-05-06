from django.db import models


class Counter(models.Model):
    value = models.IntegerField()

    def increment(self):
        self.value += 1
        self.save()
