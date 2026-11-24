import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

Score = int | None


class ParticipantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    display_name: str


class RoomOut(BaseModel):
    slug: str
    name: str
    participants: list[ParticipantOut]


class RoomCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=4, max_length=128)
    display_name: str = Field(min_length=1, max_length=40)


class RoomJoin(BaseModel):
    password: str = Field(min_length=1, max_length=128)
    display_name: str = Field(min_length=1, max_length=40)


class SessionOut(BaseModel):
    token: str
    room: RoomOut
    me: ParticipantOut


def _clean_ingredients(values: list[str]) -> list[str]:
    seen: set[str] = set()
    cleaned: list[str] = []
    for raw in values:
        item = " ".join(raw.split())[:60]
        if item and item.lower() not in seen:
            seen.add(item.lower())
            cleaned.append(item)
    return cleaned[:40]


class TeaIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    ingredients: list[str] = Field(default_factory=list)
    notes: str = Field(default="", max_length=2000)

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


class RatingIn(BaseModel):
    smell: Score = Field(default=None, ge=0, le=10)
    taste: Score = Field(default=None, ge=0, le=10)
    finish: Score = Field(default=None, ge=0, le=10)
    overall: Score = Field(default=None, ge=0, le=10)
    buy_again: bool | None = None
    note: str = Field(default="", max_length=2000)


class RatingOut(RatingIn):
    participant: ParticipantOut
    updated_at: datetime


class TeaOut(BaseModel):
    id: uuid.UUID
    name: str
    ingredients: list[str]
    notes: str
    created_by: ParticipantOut | None
    created_at: datetime
    rating_count: int
    average_overall: float | None
    my_rating: RatingIn | None
    # Other people's ratings stay hidden until you've rated the tea yourself, so nobody copies.
    ratings: list[RatingOut] | None


class TeaRank(BaseModel):
    tea_id: uuid.UUID
    name: str
    rating_count: int
    average_overall: float | None
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


class Agreement(BaseModel):
    a: ParticipantOut
    b: ParticipantOut
    shared_teas: int
    mean_difference: float | None


class Analytics(BaseModel):
    tea_count: int
    rating_count: int
    ranking: list[TeaRank]
    people: list[PersonSummary]
    ingredients: list[IngredientPreference]
    agreement: list[Agreement]
