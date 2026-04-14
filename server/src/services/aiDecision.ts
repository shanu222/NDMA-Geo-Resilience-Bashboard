import mongoose from 'mongoose';
import { hasDatabase } from '../db.js';
import { Location, WeatherData, RiskSnapshot } from '../models.js';

function openAiKey() {
  return (
    process.env.OPENAI_API_KEY ||
    process.env.OPEN_AI_API_KEY ||
    process.env.OPENAI_KEY ||
    ''
  ).trim();
}

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

async function callOpenAI(system: string, user: string): Promise<string | null> {
  const key = openAiKey();
  if (!key) return null;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.4,
      max_tokens: 600,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error('[openai]', res.status, t.slice(0, 500));
    return null;
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  return text || null;
}

function defaultSuggestions(): string[] {
  return [
    'Prioritize monsoon flood corridors along the Indus and hill torrent zones.',
    'Pre-position rescue and medical teams; verify inter-agency communication channels.',
    'Inspect bridges, embankments, and urban drainage where rainfall exceeds seasonal norms.',
  ];
}

/** Rule-based + optional OpenAI enrichment for NDMA command decisions. */
export async function buildDecisionSuggestions(): Promise<string[]> {
  const out: string[] = [];

  if (hasDatabase && mongoose.connection.readyState === 1) {
    try {
      const top = await RiskSnapshot.aggregate<{ name: string; score: number }>([
        { $sort: { computed_at: -1 } },
        {
          $group: {
            _id: '$location_id',
            score: { $first: '$score' },
            computed_at: { $first: '$computed_at' },
          },
        },
        { $sort: { score: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'locations',
            localField: '_id',
            foreignField: '_id',
            as: 'loc',
          },
        },
        { $unwind: '$loc' },
        { $project: { name: '$loc.name', score: 1 } },
      ]);

      for (const r of top) {
        const s = Number(r.score);
        if (s >= 75) {
          out.push(`High flood risk in ${r.name}. Deploy emergency teams and verify evacuation routes.`);
        } else if (s >= 55) {
          out.push(`Elevated risk in ${r.name}. Inspect critical infrastructure and pre-position assets.`);
        }
      }

      const locs = await Location.find().lean();
      let best: { name: string; rain: number } | null = null;
      for (const loc of locs) {
        const w = await WeatherData.findOne({ location_id: loc._id })
          .sort({ ts: -1 })
          .lean();
        const rain = w?.rainfall_mm != null ? Number(w.rainfall_mm) : 0;
        if (!best || rain > best.rain) best = { name: loc.name, rain };
      }
      if (best && best.rain > 0) {
        out.push(
          `Rainfall focus: ${best.name} — coordinate water-level monitoring along major channels.`,
        );
      }
    } catch (e) {
      console.error('[aiDecision/db]', e);
    }
  }

  out.push('Maintain cross-agency situational awareness and update field teams every watch cycle.');

  const unique = Array.from(new Set(out)).slice(0, 8);
  const contextBlock = unique.join('\n');

  const ai = await callOpenAI(
    'You are an expert disaster operations advisor for NDMA Pakistan. Output concise, actionable bullet lines only. No markdown numbering unless plain dashes. Max 6 lines.',
    `Given current system context (may be partial if database offline):\n${contextBlock || '(no live DB — provide general monsoon/flood priorities for Pakistan).'}\n\nRespond with up to 6 short operational recommendations for national disaster command.`,
  );

  if (ai) {
    const lines = ai
      .split(/\n+/)
      .map((l) => l.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 6);
    if (lines.length) return lines;
  }

  return unique.length ? unique.slice(0, 6) : defaultSuggestions();
}
