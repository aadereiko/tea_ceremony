import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    false,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

SCORE_FIELDS = ("smell", "taste", "finish", "overall")


class Base(DeclarativeBase):
    pass


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(16), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(80))
    icon: Mapped[str] = mapped_column(String(16))
    blind: Mapped[bool] = mapped_column(Boolean, default=True, server_default=false())
    anonymous: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    participants: Mapped[list["Participant"]] = relationship(
        back_populates="room", cascade="all, delete-orphan", order_by="Participant.created_at"
    )


class Participant(Base):
    __tablename__ = "participants"
    __table_args__ = (UniqueConstraint("room_id", "name_key"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    room_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"))
    display_name: Mapped[str] = mapped_column(String(40))
    name_key: Mapped[str] = mapped_column(String(40))
    icon: Mapped[str] = mapped_column(String(16))
    is_owner: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    room: Mapped[Room] = relationship(back_populates="participants")


class ParticipantSession(Base):
    __tablename__ = "participant_sessions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    participant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("participants.id", ondelete="CASCADE"), index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    participant: Mapped[Participant] = relationship()


class Tea(Base):
    __tablename__ = "teas"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120))
    name_key: Mapped[str] = mapped_column(String(120), unique=True)
    icon: Mapped[str] = mapped_column(String(16))
    color: Mapped[str | None] = mapped_column(String(16))
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    ingredient_links: Mapped[list["TeaIngredient"]] = relationship(
        back_populates="tea", cascade="all, delete-orphan", order_by="TeaIngredient.position"
    )


class Ingredient(Base):
    __tablename__ = "ingredients"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(60))
    name_key: Mapped[str] = mapped_column(String(60), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TeaIngredient(Base):
    __tablename__ = "tea_ingredients"

    tea_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("teas.id", ondelete="CASCADE"), primary_key=True
    )
    ingredient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ingredients.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    position: Mapped[int] = mapped_column(Integer, default=0)

    tea: Mapped[Tea] = relationship(back_populates="ingredient_links")
    ingredient: Mapped[Ingredient] = relationship()


class Tasting(Base):
    __tablename__ = "tastings"
    __table_args__ = (UniqueConstraint("room_id", "tea_id"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    room_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("rooms.id", ondelete="CASCADE"), index=True
    )
    # RESTRICT: deleting a catalog tea must not silently wipe other rooms' ratings.
    tea_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("teas.id", ondelete="RESTRICT"), index=True
    )
    added_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("participants.id", ondelete="SET NULL")
    )
    revealed: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    scores_revealed: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    tea: Mapped[Tea] = relationship()
    ratings: Mapped[list["Rating"]] = relationship(
        back_populates="tasting", cascade="all, delete-orphan"
    )


class Rating(Base):
    __tablename__ = "ratings"
    __table_args__ = (
        UniqueConstraint("tasting_id", "participant_id"),
        *(
            CheckConstraint(f"{f} IS NULL OR ({f} >= 0 AND {f} <= 10)", name=f"ck_ratings_{f}")
            for f in SCORE_FIELDS
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    tasting_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tastings.id", ondelete="CASCADE"), index=True
    )
    participant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("participants.id", ondelete="CASCADE"), index=True
    )
    smell: Mapped[int | None] = mapped_column(Integer)
    taste: Mapped[int | None] = mapped_column(Integer)
    finish: Mapped[int | None] = mapped_column(Integer)
    overall: Mapped[int | None] = mapped_column(Integer)
    buy_again: Mapped[bool | None] = mapped_column(Boolean)
    note: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    tasting: Mapped[Tasting] = relationship(back_populates="ratings")
    participant: Mapped[Participant] = relationship()


def is_hidden(tasting: Tasting, room: Room) -> bool:
    return room.blind and not tasting.revealed
