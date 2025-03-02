from django.db.models import Q


def parse_entry_query_to_qs(query: str) -> Q:
    """
    Parse a query string into a Django Q object for filtering entries
    :param query: The query string to parse
    :return: A Django Q object for filtering entries
    """
    query = query.strip()
    if query == "":
        return Q()

    query = query.replace("(", "").replace(")", "")
    query = query.replace("AND", "&").replace("OR", "|")
    query = query.replace("NOT", "~").replace(" ", "")
    return Q(eval(query))
