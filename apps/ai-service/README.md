Sentinel360 AI Service

This folder runs the FastAPI AI inference service for real-time anomaly detection.

## 📋 Quick Start

### 1. Install Dependencies

```bash
cd apps/ai-service
python3 -m pip install -r requirements.txt
```

### 2. Start the Service

```bash
python3 -m uvicorn main:app --reload --port 8000
```

The service will start on `http://127.0.0.1:8000`

## 🎯 API Endpoints

| Endpoint         | Method | Purpose                                                       |
| ---------------- | ------ | ------------------------------------------------------------- |
| `/analyze-frame` | POST   | Analyze a single frame (multipart form, field `frame`)        |
| `/events`        | GET    | Get last 50 detection events                                  |
| `/raw-stream`    | GET    | Proxy the resolved YouTube/direct stream (for testing)        |
| `/demo-stream`   | GET    | Serve local demo video from `apps/ai-service/static/demo.mp4` |

## 📦 Model Files

The service automatically looks for Keras models in two locations (in order of preference):

1. **apps/ai-service/models/** (local to service)
   - `model_an_vs_nor.h5` — binary anomaly detection
   - `model_an_cl.h5` — multi-class classification

2. **model/** (repository root, fallback)
   - `model_an_vs_nor.h5`
   - `model_an_cl.h5`

If models are not found or fail to load, the service runs in **mock mode**, which generates synthetic predictions (30% anomaly rate) for pipeline testing.

### ⚙️ Current Status

- ✅ Service running
- ✅ `/analyze-frame` endpoint working (returns mock detections)
- ✅ `/events` endpoint working
- ⚠️ Real models: failed to load (Keras 3 incompatibility with older model format)
- ⚠️ YouTube stream: resolved but OpenCV can't open HTTP live stream

### 🐛 Keras Model Compatibility

The provided `.h5` models use an older Keras format (with `time_major=False` LSTM parameters) that isn't supported by Keras 3.

**Workarounds:**

1. Retrain/export models using the newer Keras format
2. Install standalone `keras==2.x` package alongside TensorFlow
3. Use TensorFlow 2.11 (last version with full Keras 2 support)
4. Continue with mock mode for MVP testing (models detect correctly once real models load)

## 🎬 Optional: Add Demo Video

For reliable same-origin video playback in the browser:

```bash
mkdir -p apps/ai-service/static

# Option A: Download a sample video (CC0)
curl -L "https://commondatastorage.googleapis.com/gtv-videos-library/sample/ForBiggerBlazes.mp4" \
  -o apps/ai-service/static/demo.mp4 --max-filesize 50M

# Option B: Use FFmpeg to create a 10-second test video
ffmpeg -f lavfi -i testsrc=duration=10:size=640x480:rate=30 \
  -f lavfi -i sine=f=440:d=10 \
  apps/ai-service/static/demo.mp4
```

Then the `/api/live-stream` proxy will serve this video instead of the YouTube stream.

## 🔌 Integration with Node Server

The Node server proxies these endpoints:

- `POST /api/analyze` → `http://localhost:8000/analyze-frame`
- `GET /api/events` → `http://localhost:8000/events`
- `GET /api/live-stream` → proxies `/raw-stream` or redirects to `/demo-stream`

Set `AI_SERVICE_URL` environment variable to change the AI service URL (default: `http://localhost:8000`).

## 📝 Testing Endpoints

```bash
# Test frame analysis
curl -X POST -F "frame=@path/to/image.jpg" http://127.0.0.1:8000/analyze-frame

# Get recent events
curl http://127.0.0.1:8000/events | jq .

# Stream resolution test (streams raw MP4 bytes)
curl http://127.0.0.1:8000/raw-stream > test.mp4
```

## 🚀 Production Notes

- Models load at startup; service startup will be slow for large models
- Stream processing runs in background; check `/events` to see detections
- In mock mode, ~30% of frames will trigger anomaly detection
- Rate-limit `/analyze-frame` in production (no limits currently)
- All errors are logged to stdout; use a proper logging setup for production
