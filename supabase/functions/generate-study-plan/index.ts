// @ts-nocheck
// supabase/functions/generate-study-plan/index.ts
// Deploy with: supabase functions deploy generate-study-plan
// Set secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

serve(async (req) => {
  // handle CORS for browser requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { tasks, events, recentSessions } = await req.json()

    // build the prompt with all the user's data
    const today = new Date().toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })

    const prompt = buildPrompt(today, tasks, events, recentSessions)

    // call anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 6000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    })

    const data = await response.json()

    if (data.error) {
      return new Response(JSON.stringify({ error: data.error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // extract the text response
    const planText = data.content[0].text

    // try to parse as JSON (we asked for JSON in the prompt)
    let plan
    try {
      // strip markdown code fences if present
      const cleaned = planText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      plan = JSON.parse(cleaned)
    } catch {
      // if it cant parse as JSON, return as plain text
      plan = { rawText: planText, days: [] }
    }

    return new Response(JSON.stringify({ plan }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})

function buildPrompt(today, tasks, events, recentSessions) {
  // format tasks into a readable list
  const taskList = tasks.map(t => {
    let line = `- "${t.title}"`
    if (t.modules?.name) line += ` (${t.modules.name})`
    if (t.priority) line += ` [${t.priority} priority]`
    if (t.due_date) line += ` due ${new Date(t.due_date).toLocaleDateString('en-GB')}`
    if (t.deadline_type === 'flexible' && t.due_date_end) {
      line += ` to ${new Date(t.due_date_end).toLocaleDateString('en-GB')}`
    }
    if (t.estimated_duration) line += ` (~${t.estimated_duration}h estimated)`
    if (t.weighting) line += ` worth ${t.weighting}%`
    if (t.deadline_type === 'soft') line += ' (soft deadline)'
    return line
  }).join('\n')

  // format events
  const eventList = events.map(e => {
    const start = new Date(e.start_time)
    const end = e.end_time ? new Date(e.end_time) : null
    let line = `- ${start.toLocaleDateString('en-GB', { weekday: 'short' })} `
    line += `${start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
    if (end) line += `-${end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
    line += `: ${e.title} (${e.event_type})`
    if (e.location) line += ` at ${e.location}`
    return line
  }).join('\n')

  // format recent study patterns
  const sessionSummary = recentSessions.length > 0
    ? `Recent study sessions (last 7 days):\n${recentSessions.map(s =>
        `- ${s.tasks?.title || 'General study'}: ${s.duration_minutes}min on ${new Date(s.started_at).toLocaleDateString('en-GB')}`
      ).join('\n')}`
    : 'No recent study sessions recorded.'

  return `You are a study planning assistant for a university student. Today is ${today}.

Based on the student's current tasks, schedule, and study patterns, create a personalised study plan for the next 7 days.

CURRENT TASKS:
${taskList || 'No active tasks.'}

SCHEDULED EVENTS (next 2 weeks):
${eventList || 'No scheduled events.'}

STUDY PATTERNS:
${sessionSummary}

RULES:
1. Schedule study sessions around existing events (lectures, tutorials, work)
2. Prioritise tasks by deadline proximity AND priority level AND weighting
3. Break large tasks into smaller study sessions (max 2 hours per session)
4. Include breaks between sessions
5. Don't schedule before 8am or after 10pm
6. Leave weekends lighter unless deadlines are very close
7. Flag any risks (e.g. "3 deadlines on Thursday but nothing scheduled Tuesday")
8. If a task has a soft deadline, it can be moved more flexibly
9. If a task has an estimated duration, respect it when allocating time
10. Higher weighting tasks deserve proportionally more study time

Respond ONLY with a JSON object (no markdown, no backticks, no explanation) in this format:
{
  "summary": "Brief overview of the week ahead",
  "risks": ["any warnings or concerns"],
  "days": [
    {
      "date": "2026-03-28",
      "dayName": "Saturday",
      "blocks": [
        {
          "startTime": "09:00",
          "endTime": "11:00",
          "title": "Work on Database Coursework",
          "taskTitle": "Database Coursework",
          "type": "study",
          "notes": "Focus on ER diagram section"
        },
        {
          "startTime": "11:00",
          "endTime": "11:15",
          "title": "Break",
          "type": "break"
        }
      ]
    }
  ]
}`
    }