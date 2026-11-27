# Analytics

> **In short:** the Analytics page answers "which tea won?", "who is the strictest taster?",
> "which ingredients do we like?" and "who has the same taste as me?". It only counts teas whose
> scores are revealed.

Open it with the **Analytics** button in the room. It has three tabs:

- **Ranking:** the [fair ranking](#fair-ranking) and the [taste map](#taste-map).
- **Tasters:** [each taster's averages](#each-taster), [what drives Overall](#what-drives-overall)
  and [who agrees](#who-agrees).
- **Ingredients:** [which ingredients you like](#ingredients).

> **Tip:** numbers with a dotted underline explain themselves. Hover over them, or tap them on a
> phone. Chart dots and bars do the same.

## Fair ranking

The teas are ranked by a **fair score**, not a plain average.

**Why?** With a plain average, one person giving a tea a 10 beats a tea that two people both
scored 9. But one person's opinion tells us much less than two people agreeing.

**How it works:** every tea counts as if it also had **2 extra pretend votes** at the room's
average. The pretend votes pull teas with few ratings towards the middle. The more people rate a
tea, the less they matter.

**An example.** The room's average is 6.4.

| Tea | Real scores | Plain average | Fair score |
|---|---|---|---|
| One fan | 10 | 10 | (6.4 + 6.4 + 10) ÷ 3 = **7.6** |
| Both like it | 9, 9 | 9 | (6.4 + 6.4 + 9 + 9) ÷ 4 = **7.7** |

"Both like it" wins, because two people agree it's good. Each tea in the ranking also shows its
plain average.

> **Fun fact:** this is called a *Bayesian average*. Film sites like IMDb rank films the same way.

## Taste map

A chart with **one dot per tea**, in the tea's brew colour. Tap a dot to see which tea it is.

- **Left to right:** the tea's fair score. Further right is better.
- **Bottom to top:** how much the tasters disagreed, meaning the gap between the highest and the
  lowest Overall score. If Michał gave 9 and Sashka gave 2, the tea sits at 7.

So the corners tell a story:

| Where the dot is | What it means |
|---|---|
| Bottom right | **Everyone loves it.** High score, and you all agree. |
| Bottom left | **Nobody likes it.** Low score, and you all agree. |
| Top | **Splits the room.** Some loved it, some didn't. Great teas to talk about. |

A tea needs scores from at least two people to be on the map.

## Each taster

The average score each person gives, for each of Smell, Taste, Finish and Overall.

- A low average means a strict taster. A high one means a generous taster.
- **PDF** saves that person's notes.

Hidden in [anonymous rooms](/docs/settings#anonymous-ratings).

## What drives Overall

Your Overall score is your total verdict. But what is it really based on: the smell, the taste
or the finish? This chart answers that, for each person and for everyone together.

Each bar is a number from **−1 to 1**, called a **correlation**. It measures how much two scores
rise and fall together:

- **Near 1:** when this score is high, your Overall is high too. It's what you care about most.
- **Near 0:** no link. This score doesn't change your verdict much.
- **Below 0:** the opposite. When this score is high, your Overall tends to be low. That's rare,
  and usually just chance.

**An example.** Over five teas, Sashka's Taste scores were 2, 4, 6, 8, 10 and the Overall scores were
the same. Taste and Overall rise together perfectly, so Taste gets **1.0**. Sashka's Finish was 5
every time, so it can't explain anything and gets no bar.

> **Careful:** a person needs at least **5 rated teas** before their chart appears. With fewer, one
> odd cup can swing the number a lot. Even with 5 to 10 teas, read it as a hint, not a fact.

## Ingredients

For each ingredient: did teas with it score higher or lower than usual?

- **+1.5** means teas with this ingredient got 1.5 points more than that person's normal score.
- **−1.0** means one point less.

Each score is compared with **that person's own average**. Otherwise someone who scores everything
high would look like they love every ingredient.

Use **In at least … teas** to hide ingredients that appear in too few teas to mean much. One cup
can't tell you much.

## Who agrees

For each pair of tasters: how many points apart their Overall scores are, on average, over the
teas both rated. **A small number means similar taste.**
