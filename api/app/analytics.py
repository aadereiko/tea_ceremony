from collections import defaultdict
from itertools import combinations
from statistics import mean, stdev

from app.models import SCORE_FIELDS, Rating, Room, Tasting, is_hidden, scores_shown
from app.schemas import (
    Agreement,
    Analytics,
    Driver,
    IngredientPreference,
    ParticipantOut,
    PersonSummary,
    TeaRank,
)


def _avg(values: list[int | float | None]) -> float | None:
    present = [v for v in values if v is not None]
    return round(mean(present), 2) if present else None


# Below this, one odd cup swings a correlation so much that showing it would mislead.
MIN_DRIVER_TEAS = 5
DRIVER_FIELDS = ("smell", "taste", "finish")


def _correlation(pairs: list[tuple[int, int]]) -> float | None:
    if len(pairs) < MIN_DRIVER_TEAS:
        return None
    xs, ys = [x for x, _ in pairs], [y for _, y in pairs]
    sx, sy = stdev(xs), stdev(ys)
    # Someone who gave every tea the same Smell score tells us nothing about what Smell does.
    if sx == 0 or sy == 0:
        return None
    mx, my = mean(xs), mean(ys)
    covariance = sum((x - mx) * (y - my) for x, y in pairs) / (len(pairs) - 1)
    return round(covariance / (sx * sy), 2)


def _driver(participant: ParticipantOut | None, ratings: list[Rating]) -> Driver:
    scored = [r for r in ratings if r.overall is not None]
    return Driver(
        participant=participant,
        teas=len(scored),
        correlation={
            f: _correlation(
                [(getattr(r, f), r.overall) for r in scored if getattr(r, f) is not None]
            )
            for f in DRIVER_FIELDS
        },
    )


# How many room-average votes every tea starts with. Small on purpose: rooms are a few friends,
# so a bigger number would drown out what people actually scored.
PRIOR_VOTES = 2


def _fair_score(scores: list[int], room_mean: float | None) -> float | None:
    if not scores or room_mean is None:
        return None
    return round((PRIOR_VOTES * room_mean + sum(scores)) / (PRIOR_VOTES + len(scores)), 2)


def build_analytics(all_teas: list[Tasting], room: Room) -> Analytics:
    people = list(room.participants)
    # Scores nobody has revealed must not leak through averages, so they are left out entirely.
    teas = [t for t in all_teas if scores_shown(t, room)]
    position = {t.id: n for n, t in enumerate(all_teas, start=1)}
    ratings: list[Rating] = [r for t in teas for r in t.ratings]
    by_person: dict[str, list[Rating]] = defaultdict(list)
    for r in ratings:
        by_person[str(r.participant_id)].append(r)

    room_mean = _avg([r.overall for r in ratings])
    overall_of_tea = {t.id: [r.overall for r in t.ratings if r.overall is not None] for t in teas}
    ranking = [
        TeaRank(
            tasting_id=t.id,
            hidden=is_hidden(t, room),
            icon="mystery" if is_hidden(t, room) else t.tea.icon,
            color=None if is_hidden(t, room) else t.tea.color,
            name=f"Mystery tea #{position[t.id]}" if is_hidden(t, room) else t.tea.name,
            rating_count=len(t.ratings),
            average_overall=_avg([r.overall for r in t.ratings]),
            fair_score=_fair_score(overall_of_tea[t.id], room_mean),
            spread=max(overall_of_tea[t.id]) - min(overall_of_tea[t.id])
            if len(overall_of_tea[t.id]) > 1
            else None,
            average_by_field={f: _avg([getattr(r, f) for r in t.ratings]) for f in SCORE_FIELDS},
            buy_again_yes=sum(1 for r in t.ratings if r.buy_again),
        )
        for t in teas
        if t.ratings
    ]
    ranking.sort(
        key=lambda row: (row.fair_score is None, -(row.fair_score or 0), -row.rating_count)
    )

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

    drivers = [_driver(None, ratings)] + [
        _driver(ParticipantOut.model_validate(p), by_person[str(p.id)]) for p in people
    ]

    if room.anonymous:
        # Each of these is per person, which is exactly what an anonymous room promises to hide.
        summaries, agreement, drivers = [], [], drivers[:1]
        for row in ingredients:
            row.relative_by_person = {}

    taster_count = len({r.participant_id for r in ratings})

    return Analytics(
        anonymous=room.anonymous,
        taster_count=taster_count,
        tea_count=len(all_teas),
        rating_count=len(ratings),
        room_average=room_mean,
        prior_votes=PRIOR_VOTES,
        ranking=ranking,
        people=summaries,
        ingredients=ingredients,
        agreement=agreement,
        drivers=drivers,
        min_driver_teas=MIN_DRIVER_TEAS,
    )
