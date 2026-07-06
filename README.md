# 3D AI Voice Assistant

A local-first Jarvis-style voice assistant scaffold with a FastAPI backend, Groq-backed AutoGen agent, PostgreSQL persistence, and a React Three Fiber avatar UI.

## What is included

- Push-to-talk browser mic capture over WebSocket.
- Typed text fallback through the same WebSocket.
- Groq Whisper STT wrapper and optional Groq TTS wrapper.
- Browser `SpeechSynthesis` fallback when Groq TTS is disabled.
- AutoGen `AssistantAgent` isolated under `backend/app/agents`.
- PostgreSQL sessions and messages with Alembic migration.
- React 18 + Vite + React Three Fiber + drei + Zustand frontend.
- Animated robot fallback avatar with idle, listening, thinking, and speaking states.

## Setup

1. Start Postgres:

```bash
docker compose up -d
```

2. Configure the backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Fill in `GROQ_API_KEY` in `backend/.env`. The LLM, STT, and TTS model names are environment variables so they can be changed without editing code.

3. Run migrations:

```bash
alembic upgrade head
```

4. Start the backend:

```bash
uvicorn app.main:app --reload
```

5. Configure and run the frontend:

```bash
cd ../frontend
npm install
copy .env.example .env
npm run dev
```

Open `http://localhost:5173`.

## API

- `GET /api/health`
- `POST /api/sessions`
- `GET /api/sessions`
- `GET /api/sessions/{session_id}`
- `POST /api/chat`
- `WS /ws/{session_id}`

WebSocket client messages:

```json
{"type":"audio_chunk","data":"<base64>"}
{"type":"audio_end"}
{"type":"text_input","data":"Hello"}
```

WebSocket server messages:

```json
{"type":"transcript","text":"Hello"}
{"type":"response_chunk","text":"Hi there "}
{"type":"audio_chunk","data":"<base64>","mime_type":"audio/mpeg"}
{"type":"response_end","text":"Hi there.","audio_sent":false}
{"type":"error","message":"..."}
```

## Assumptions

- No user accounts or auth in v1; sessions are anonymous and stored in browser local storage.
- Groq TTS is disabled by default with `ENABLE_GROQ_TTS=false`; the browser speaks responses for zero-cost local testing.
- A licensed GLB robot is not bundled. Set `VITE_ROBOT_MODEL_URL=/models/robot.glb` after placing a model under `frontend/public/models/`, or keep the procedural fallback avatar.
- The assistant uses a single AutoGen agent for lower voice latency.
- Live token streaming is represented by chunking the completed agent answer in the WebSocket route. The agent module is isolated so true model streaming can replace this later.

## Notes

The requested default Groq model is `meta-llama/llama-4-scout-17b-16e-instruct`. It is configured through `GROQ_MODEL`, not hardcoded into the agent.
# voice_ai_agent
