from collections import defaultdict
from itertools import combinations
from statistics import mean

from app.models import SCORE_FIELDS, Rating, Room, Tasting, is_hidden
from app.schemas import (
    Agreement,
    Analytics,
    IngredientPreference,
    ParticipantOut,
    PersonSummary,
    TeaRank,
)


def _avg(values: list[int | float | None]) -> float | None:
    present = [v for v in values if v is not None]
    return round(mean(present), 2) if present else None


def build_analytics(all_teas: list[Tasting], room: Room) -> Analytics:
    people = list(room.participants)
    # Scores nobody has revealed must not leak through averages, so they are left out entirely.
    teas = [t for t in all_teas if t.scores_revealed]
    position = {t.id: n for n, t in enumerate(all_teas, start=1)}
    ratings: list[Rating] = [r for t in teas for r in t.ratings]
    by_person: dict[str, list[Rating]] = defaultdict(list)
    for r in ratings:
        by_person[str(r.participant_id)].append(r)

    ranking = [
        TeaRank(
            tasting_id=t.id,
            hidden=is_hidden(t, room),
            icon="mystery" if is_hidden(t, room) else t.tea.icon,
            color=None if is_hidden(t, room) else t.tea.color,
            name=f"Mystery tea #{position[t.id]}" if is_hidden(t, room) else t.tea.name,
            rating_count=len(t.ratings),
            average_overall=_avg([r.overall for r in t.ratings]),
            average_by_field={f: _avg([getattr(r, f) for r in t.ratings]) for f in SCORE_FIELDS},
            buy_again_yes=sum(1 for r in t.ratings if r.buy_again),
        )
        for t in teas
        if t.ratings
    ]
    ranking.sort(key=lambda row: (row.average_overall is None, -(row.average_overall or 0)))

    summaries = [
        PersonSummary(
            participant=ParticipantOut.model_validate(p),
            rated=len(by_person[str(p.id)]),
            average_overall=_avg([r.overall for r in by_person[str(p.id)]]),
            average_by_field={
                f: _avg([getattr(r, f) for r in by_person[str(p.id)]]) for f in SCORE_FIELDS
            },
        )
        for p in people
    ]
    baseline = {s.participant.id.hex: s.average_overall for s in summaries}

    # Compared with each person's own average, so someone who scores everything high doesn't
    # look like they like every ingredient more.
    diffs: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    labels: dict[str, str] = {}
    tea_counts: dict[str, int] = defaultdict(int)
    # A hidden tea's ingredients would hint at what it is, so only revealed teas count here.
    for t in (t for t in teas if not is_hidden(t, room)):
        for link in t.tea.ingredient_links:
            key, label = str(link.ingredient_id), link.ingredient.name
            labels.setdefault(key, label)
            tea_counts[key] += 1
            for r in t.ratings:
                base = baseline.get(r.participant_id.hex)
                if r.overall is not None and base is not None:
                    diffs[key][str(r.participant_id)].append(r.overall - base)

    ingredients = [
        IngredientPreference(
            ingredient=labels[key],
            teas=tea_counts[key],
            relative_by_person={pid: _avg(vals) for pid, vals in diffs[key].items()},
            relative_all=_avg([v for vals in diffs[key].values() for v in vals]),
        )
        for key in labels
    ]
    ingredients.sort(key=lambda row: (row.relative_all is None, -(row.relative_all or 0)))

    overall_of = {(str(r.participant_id), r.tasting_id): r.overall for r in ratings}
    agreement = []
    for a, b in combinations(people, 2):
        gaps = [
            abs(overall_of[(str(a.id), t.id)] - overall_of[(str(b.id), t.id)])
            for t in teas
            if overall_of.get((str(a.id), t.id)) is not None
            and overall_of.get((str(b.id), t.id)) is not None
        ]
        agreement.append(
            Agreement(
                a=ParticipantOut.model_validate(a),
                b=ParticipantOut.model_validate(b),
                shared_teas=len(gaps),
                mean_difference=_avg(gaps),
            )
        )

    if room.anonymous:
        # Each of these is per person, which is exactly what an anonymous room promises to hide.
        summaries, agreement = [], []
        for row in ingredients:
            row.relative_by_person = {}

    taster_count = len({r.participant_id for r in ratings})

    return Analytics(
        anonymous=room.anonymous,
        taster_count=taster_count,
        tea_count=len(all_teas),
        rating_count=len(ratings),
        ranking=ranking,
        people=summaries,
        ingredients=ingredients,
        agreement=agreement,
    )
