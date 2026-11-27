import random

ROOM_ICONS = ["lantern", "house", "mountain", "moon", "autumn", "snowflake", "gift", "torii"]
TEA_ICONS = ["cup", "teapot", "mug", "boba", "gaiwan", "matcha", "iced", "flask"]
PERSON_ICONS = [
    "fox",
    "cat",
    "dog",
    "bear",
    "panda",
    "rabbit",
    "owl",
    "frog",
    "penguin",
    "mouse",
    "koala",
    "chick",
]


def pick(icons: list[str], taken: set[str] = frozenset()) -> str:
    free = [i for i in icons if i not in taken]
    return random.choice(free or icons)


TEA_COLORS = ["pale", "gold", "jade", "golden", "amber", "copper", "ruby", "dark"]
