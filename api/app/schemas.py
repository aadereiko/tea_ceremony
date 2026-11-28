import uuid
from datetime import datetime
from typing import Annotated

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

from app.icons import PERSON_ICONS, ROOM_ICONS, TEA_COLORS, TEA_ICONS
from app.names import normalize_name

Score = int | None


def _one_of(allowed: list[str]):
    def check(value: str) -> str:
        if value not in allowed:
            raise ValueError(f"Unknown choice {value!r}")
        return value

    return AfterValidator(check)


RoomIcon = Annotated[str, _one_of(ROOM_ICONS)]
TeaIcon = Annotated[str, _one_of(TEA_ICONS)]
PersonIcon = Annotated[str, _one_of(PERSON_ICONS)]
TeaColor = Annotated[str, _one_of(TEA_COLORS)]


class ParticipantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    display_name: str
    icon: str
    is_owner: bool


class RoomOut(BaseModel):
    slug: str
    name: str
    icon: str
    blind: bool
    anonymous: bool
    hide_scores: bool
    participants: list[ParticipantOut]


class RoomCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=4, max_length=128)
    display_name: str = Field(min_length=1, max_length=40)
    icon: RoomIcon | None = None
    my_icon: PersonIcon | None = None
    blind: bool = True
    anonymous: bool = False
    # Left out, it follows `anonymous`: an anonymous room hides scores unless asked not to.
    hide_scores: bool | None = None


class RoomJoin(BaseModel):
    password: str = Field(min_length=1, max_length=128)
    display_name: str = Field(min_length=1, max_length=40)
    my_icon: PersonIcon | None = None


class RoomUpdate(BaseModel):
    icon: RoomIcon | None = None
    blind: bool | None = None
    anonymous: bool | None = None
    hide_scores: bool | None = None


class MeUpdate(BaseModel):
    icon: PersonIcon


class SessionOut(BaseModel):
    token: str
    room: RoomOut
    me: ParticipantOut


def clean_ingredient(raw: str) -> str:
    return " ".join(raw.split())[:60]


def _clean_ingredients(values: list[str]) -> list[str]:
    seen: set[str] = set()
    cleaned: list[str] = []
    for raw in values:
        item = clean_ingredient(raw)
        if item and normalize_name(item) not in seen:
            seen.add(normalize_name(item))
            cleaned.append(item)
    return cleaned[:40]


class TeaIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    ingredients: list[str] = Field(default_factory=list)
    icon: TeaIcon | None = None
    color: TeaColor | None = None
    notes: str = Field(default="", max_length=2000)
    # Left out, the tea keeps the shops it has, so older clients that don't know about shops
    # can't unlink them by saving.
    shop_ids: list[uuid.UUID] | None = Field(default=None, max_length=50)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = " ".join(value.split())
        if not value:
            raise ValueError("Name can't be blank")
        return value

    @field_validator("ingredients")
    @classmethod
    def clean_ingredients(cls, value: list[str]) -> list[str]:
        return _clean_ingredients(value)


class IngredientRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    image_url: str | None = None
    image_credit: str | None = None
    image_source: str | None = None


class ShopRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    city: str
    country: str


class TeaRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    icon: str
    color: str | None


class CatalogTeaOut(BaseModel):
    id: uuid.UUID
    name: str
    icon: str
    color: str | None
    notes: str
    ingredients: list[IngredientRef]
    shops: list[ShopRef]
    room_count: int


class TastingAdd(BaseModel):
    tea_id: uuid.UUID | None = None
    new_tea: TeaIn | None = None

    @model_validator(mode="after")
    def exactly_one(self) -> "TastingAdd":
        if (self.tea_id is None) == (self.new_tea is None):
            raise ValueError("Pick a tea from the catalog or describe a new one, not both")
        return self


class VisibilityIn(BaseModel):
    revealed: bool | None = None
    scores_revealed: bool | None = None


class RatingIn(BaseModel):
    smell: Score = Field(default=None, ge=0, le=10)
    taste: Score = Field(default=None, ge=0, le=10)
    finish: Score = Field(default=None, ge=0, le=10)
    overall: Score = Field(default=None, ge=0, le=10)
    buy_again: bool | None = None
    note: str = Field(default="", max_length=2000)


class RatingOut(RatingIn):
    # None in an anonymous room; is_mine still lets you find your own row.
    participant: ParticipantOut | None
    is_mine: bool
    # None in an anonymous room too: save times could hint at who rated what.
    updated_at: datetime | None


class TastingOut(BaseModel):
    id: uuid.UUID
    # None while the room tastes blind and nobody has revealed this tea yet.
    tea: CatalogTeaOut | None
    # Only the host gets this for a hidden tea, so "Add tea" can skip teas already in the room.
    tea_id: uuid.UUID | None
    hidden: bool
    # Sent even for a mystery tea: it usually holds the brewing steps, which tasters need.
    notes: str
    added_by: ParticipantOut | None
    created_at: datetime
    rating_count: int
    average_overall: float | None
    my_rating: RatingIn | None
    scores_revealed: bool
    # Everyone's ratings stay hidden until someone in the room reveals them, so nobody copies.
    ratings: list[RatingOut] | None


class IngredientOut(IngredientRef):
    tea_count: int
    built_in: bool


class IngredientRename(BaseModel):
    name: str = Field(min_length=1, max_length=60)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = clean_ingredient(value)
        if not value:
            raise ValueError("Name can't be blank")
        return value


class IngredientRenamed(BaseModel):
    ingredient: IngredientOut
    merged: bool


class TeaRank(BaseModel):
    tasting_id: uuid.UUID
    hidden: bool
    icon: str
    color: str | None
    name: str
    rating_count: int
    average_overall: float | None
    # The average pulled towards the room's average, more so for teas with few ratings.
    fair_score: float | None
    # Highest minus lowest Overall: how much the tasters disagreed. None with fewer than 2 scores.
    spread: int | None
    average_by_field: dict[str, float | None]
    buy_again_yes: int


class PersonSummary(BaseModel):
    participant: ParticipantOut
    rated: int
    average_overall: float | None
    average_by_field: dict[str, float | None]


class IngredientPreference(BaseModel):
    ingredient: str
    teas: int
    relative_by_person: dict[str, float | None]
    relative_all: float | None


class Driver(BaseModel):
    # None is everyone's ratings pooled together.
    participant: ParticipantOut | None
    teas: int
    # How closely each score moves with Overall, from -1 to 1. None until there are enough teas.
    correlation: dict[str, float | None]


class Agreement(BaseModel):
    a: ParticipantOut
    b: ParticipantOut
    shared_teas: int
    mean_difference: float | None


class Analytics(BaseModel):
    anonymous: bool
    taster_count: int
    tea_count: int
    rating_count: int
    room_average: float | None
    prior_votes: int
    ranking: list[TeaRank]
    people: list[PersonSummary]
    ingredients: list[IngredientPreference]
    agreement: list[Agreement]
    drivers: list[Driver]
    min_driver_teas: int


def _one_line(value: str) -> str:
    return " ".join(value.split())


class ShopIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    country: str = Field(pattern=r"^[A-Z]{2}$")
    city: str = Field(min_length=1, max_length=80)
    address: str = Field(default="", max_length=200)
    website: str = Field(default="", max_length=300)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)

    @field_validator("name", "city")
    @classmethod
    def not_blank(cls, value: str) -> str:
        value = _one_line(value)
        if not value:
            raise ValueError("Can't be blank")
        return value

    @field_validator("address")
    @classmethod
    def clean_address(cls, value: str) -> str:
        return _one_line(value)

    @field_validator("website")
    @classmethod
    def web_link(cls, value: str) -> str:
        value = value.strip()
        # Shown as a link, so a "javascript:" address would run code for whoever clicks it.
        if value and not value.lower().startswith(("http://", "https://")):
            value = "https://" + value
        return value

    @model_validator(mode="after")
    def both_coordinates(self) -> "ShopIn":
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Give both latitude and longitude, or neither")
        return self


class ShopAuthor(BaseModel):
    name: str
    icon: str
    is_me: bool


class ShopScoreIn(BaseModel):
    score: int = Field(ge=0, le=10)


class ShopScoreOut(BaseModel):
    author: ShopAuthor
    score: int
    updated_at: datetime


class ShopCommentIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)

    @field_validator("text")
    @classmethod
    def not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Write something first")
        return value


class ShopCommentOut(BaseModel):
    id: uuid.UUID
    author: ShopAuthor
    text: str
    created_at: datetime


class ShopSummary(BaseModel):
    id: uuid.UUID
    name: str
    country: str
    city: str
    address: str
    website: str
    latitude: float | None
    longitude: float | None
    score_count: int
    average_score: float | None
    my_score: int | None
    comment_count: int


class ShopOut(ShopSummary):
    teas: list[TeaRef]
    scores: list[ShopScoreOut]
    comments: list[ShopCommentOut]
