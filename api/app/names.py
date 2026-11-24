import unicodedata


def normalize_name(display_name: str) -> str:
    """Turn a typed name into the key that decides whether two names are "the same" in a room."""
    # NFKC folds look-alike Unicode forms (full-width letters, ligatures) into one spelling, and
    # casefold() is a stronger lower() that also matches German ß with "ss".
    return " ".join(unicodedata.normalize("NFKC", display_name).casefold().split())
