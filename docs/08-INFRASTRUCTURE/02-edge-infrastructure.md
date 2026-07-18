# Sentinel360 — Edge Infrastructure

> **Document:** 02-edge-infrastructure.md  
> **Version:** 1.0  
> **Status:** Draft  
> **Last Updated:** June 2026  
> **Category:** Infrastructure & Automation

---

## Table of Contents

1. [Edge Compute Node Specification](#edge-compute-node-specification)
2. [Camera Integration](#camera-integration)
3. [Edge Software Stack](#edge-software-stack)
4. [Edge-to-Cloud Connectivity](#edge-to-cloud-connectivity)
5. [Edge Device Provisioning & Management](#edge-device-provisioning--management)
6. [Offline Tolerance & Sync Strategy](#offline-tolerance--sync-strategy)
7. [Health Monitoring & Alerting](#health-monitoring--alerting)
8. [Security Architecture](#security-architecture)
9. [Operating Procedures](#operating-procedures)

---

## Edge Compute Node Specification

### Hardware Platform: NVIDIA Jetson Orin

The edge compute node is built on the **NVIDIA Jetson Orin** family of embedded AI devices, selected for its superior GPU performance-per-watt, TensorRT optimisation for ONNX models, and industrial temperature range.

```
┌─────────────────────────────────────────────────────────────┐
│                  NVIDIA Jetson Orin Edge Node                │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  NVIDIA Ampere GPU (2048 CUDA cores, 64 Tensor      │    │
│  │  Cores) — up to 275 TOPS (INT8)                     │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  12-core ARM Cortex-A78AE CPU @ 2.2 GHz             │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  32GB LPDDR5 RAM (204 GB/s bandwidth)               │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  256GB NVMe SSD (expandable via M.2 slot)           │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  Dual Gigabit Ethernet (PoE+)                       │    │
│  │  Wi-Fi 6E + Bluetooth 5.3                           │    │
│  │  USB 3.2 Gen2 × 4, HDMI 2.1, DisplayPort 1.4       │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  Industrial temperature: -25°C to +80°C            │    │
│  │  Fanless (passive cooling) up to 25W TDP            │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Model Variants

| Model | GPU TOPS (INT8) | RAM | Storage | Use Case |
|-------|----------------|-----|---------|----------|
| **Jetson Orin NX 16GB** | 100 TOPS | 16GB | 128GB | Single 360° camera, basic analytics |
| **Jetson Orin NX 32GB** | 157 TOPS | 32GB | 256GB | 2-4 cameras, multi-model inference |
| **Jetson Orin AGX 32GB** | 200 TOPS | 32GB | 512GB | 4-8 cameras, full AI stack |
| **Jetson Orin AGX 64GB** | 275 TOPS | 64GB | 1TB | 8+ cameras, 3D reconstruction preview |

> **Default deployment:** Jetson Orin AGX 32GB — balances cost, power, and performance for multi-camera sites.

### Physical Enclosure

```
┌───────────────────────────────────────────────────────────────┐
│                        IP65 Enclosure                          │
│                                                               │
│   ┌───────────────────────────────────────────────────────┐   │
│   │  Top panel: Heat sink fins (passive cooling)          │   │
│   │  Front panel:                                         │   │
│   │    ● Power LED (green/amber/red)                       │   │
│   │    ● Status LED (healthy/error/boot)                  │   │
│   │    ● Link LED (connected/disconnected)                │   │
│   │  Bottom panel:                                         │   │
│   │    ● 2× RJ45 Ethernet (PoE+ 802.3at)                  │   │
│   │    ● 4× BNC/SMA antenna connectors                   │   │
│   │    ● 2× USB 3.2 Type-C (waterproof)                   │   │
│   │    ● Locking DC power connector (12V-24V)             │   │
│   └───────────────────────────────────────────────────────┘   │
│                                                               │
│   Mounting: Wall-mount bracket + pole-mount adapter            │
│   Dimensions: 250mm × 180mm × 60mm                            │
│   Weight: 2.8kg (with enclosure)                              │
│   Operating temp: -25°C to +80°C                              │
└───────────────────────────────────────────────────────────────┘
```

### Power Specifications

| Parameter | Value |
|-----------|-------|
| Input voltage | 12V — 24V DC |
| Power consumption | 15W — 60W (configurable power modes) |
| PoE+ budget | 30W per Ethernet port |
| Backup power | Internal supercapacitor (60s graceful shutdown) |
| Power modes | 15W (MAXN), 30W (balanced), 60W (performance) |

---

## Camera Integration

### Supported Camera Types

| Camera Type | Resolution | FOV | Connection | Use Case |
|-------------|------------|-----|------------|----------|
| **360° panoramic** | 4× 4K (stitched 8K) | 360° × 180° | RTSP over PoE+ | Full scene capture, 3D reconstruction |
| **PTZ (pan-tilt-zoom)** | 4K @ 30fps | Variable 4°-90° | RTSP over PoE+ | Targeted surveillance, zoomed identification |
| **Fixed bullet** | 4K @ 30fps | 90°-120° | RTSP over PoE+ | Perimeter monitoring, ALPR |
| **Thermal** | 640×512 @ 30fps | 45° | RTSP over PoE+ | Night detection, heat signature |

### 360° Camera: RTSP Stream Topology

Each 360-degree camera exposes **multiple RTSP streams** for different processing pipelines:

```
360° Camera (e.g., Insta360 Titan, Ricoh Theta Z1)
│
├── RTSP Stream 1: Full stitched 8K @ 5 FPS
│   └── Frame grabber → 360° scene capture → 3D reconstruction
│
├── RTSP Stream 2: Four de-warped 4K views @ 15 FPS
│   ├── Viewport 1 (0°): Face detection + ALPR
│   ├── Viewport 2 (90°): Face detection + ALPR
│   ├── Viewport 3 (180°): Behaviour analysis
│   └── Viewport 4 (270°): Behaviour analysis
│
└── RTSP Stream 3: Low-res overview 1080p @ 5 FPS
    └── Motion detection trigger → wake full pipeline
```

### Stream Configuration

| Parameter | Value |
|-----------|-------|
| Protocol | RTSP over TCP (interleaved mode) |
| Transport | RTP/AVP over UDP (preferred) or TCP fallback |
| Codec | H.265/HEVC (primary), H.264 (fallback) |
| Authentication | Digest auth (RTSP username/password) |
| Reconnection | Exponential backoff: 1s, 2s, 4s, 8s, 30s cap |
| Buffer size | 500ms jitter buffer (configurable) |

### Camera Registration Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Admin    │────►│ System   │────►│ Edge     │────►│ Camera   │
│ Registers│     │ Creates  │     │ Node     │     │ Stream   │
│ Camera   │     │ Camera   │     │ Config   │     │ Verified │
│ via API  │     │ Record   │     │ Updated  │     │          │
└──────────┘     └──────────┘     └──────────┘     └────┬─────┘
                                                          │
                                                ┌─────────▼─────────┐
                                                │ Frame Grabber     │
                                                │ Starts Capturing  │
                                                │ at configured FPS │
                                                └───────────────────┘
```

### RTSP Stream Health Checks

```bash
# Check camera stream availability
ffprobe -v quiet -print_format json -show_streams \
  -rtsp_transport tcp -timeout 5000000 \
  "rtsp://user:pass@camera-ip:554/stream1"

# Expected output includes: codec_type, width, height, r_frame_rate
# If timeout or no streams → mark camera as OFFLINE

# Measure stream latency (capture timestamp vs wall clock)
ffmpeg -i "rtsp://..." -vf "drawtext=text='%{pts\:hms}':box=1" \
  -f null - 2>&1 | grep "real_time"
```

---

## Edge Software Stack

### Container Architecture

The edge node runs three primary Docker containers orchestrated via **Docker Compose**, plus supporting sidecars for monitoring and connectivity:

```
┌─────────────────────────────────────────────────────────────────┐
│                  Edge Node (Jetson Orin)                         │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │   Docker Containers (docker-compose)                       │  │
│  │                                                            │  │
│  │  ┌──────────────────┐  ┌──────────────────┐               │  │
│  │  │  frame-grabber   │  │  ai-inference    │               │  │
│  │  │                  │  │                  │               │  │
│  │  │  - RTSP client   │  │  - YOLOv8 (Obj   │               │  │
│  │  │  - Frame capture │  │    Detection)     │               │  │
│  │  │  - De-warp 360°  │  │  - ArcFace (Face │               │  │
│  │  │  - JPG encode    │  │    Recognition)  │               │  │
│  │  │  - Batch buffer  │  │  - ALPR (Plate)  │               │  │
│  │  │    (60 frames)   │  │  - Behaviour     │               │  │
│  │  │                  │  │    Analysis       │               │  │
│  │  └────────┬─────────┘  └────────┬─────────┘               │  │
│  │           │                     │                          │  │
│  │           │    ┌───────────────┘                          │  │
│  │           ▼    ▼                                          │  │
│  │  ┌──────────────────┐  ┌──────────────────┐               │  │
│  │  │  edge-buffer     │  │  health-agent    │               │  │
│  │  │                  │  │                  │               │  │
│  │  │  - Local queue   │  │  - GPU metrics   │               │  │
│  │  │  - SQLite store  │  │  - CPU/mem/disk  │               │  │
│  │  │  - Disk cache    │  │  - Process health│               │  │
│  │  │  - Sync manager  │  │  - Heartbeat     │               │  │
│  │  └────────┬─────────┘  │  - Log shipping  │               │  │
│  │           │            └──────────────────┘               │  │
│  │           ▼                                                │  │
│  │  ┌────────────────────────────────────────────────────┐   │  │
│  │  │  Kafka Producer + S3 Uploader (inside edge-buffer)  │   │  │
│  │  └────────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────┐               │
│  │  System Services (host)                        │               │
│  │  - Docker Engine 24+                          │               │
│  │  - NVIDIA Container Toolkit (nvidia-docker2)   │               │
│  │  - Ubuntu 22.04 LTS (ARM64)                    │               │
│  │  - mTLS certificate management (cert renew)    │               │
│  │  - OTA update agent (rauc / Mender)            │               │
│  └───────────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

### Container Specifications

#### 1. Frame Grabber (`sentinel360/frame-grabber`)

```dockerfile
# Dockerfile.frame-grabber
FROM nvcr.io/nvidia/l4t-jetpack:r35.4.1

RUN apt-get update && apt-get install -y \
    ffmpeg gstreamer1.0-tools \
    python3-pip python3-opencv \
    && rm -rf /var/lib/apt/lists/*

COPY --from=oven/bun:1.3-slim /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app
COPY apps/edge/frame-grabber/ .

# GPU-accelerated frame capture pipeline
# Uses NVDEC for hardware decoding, NVENC for encoding
ENTRYPOINT ["bun", "run", "src/index.ts"]
```

| Resource | Request | Limit |
|----------|---------|-------|
| CPU | 2 cores | 4 cores |
| Memory | 2GB | 4GB |
| GPU | — | 1× NVDEC/NVENC engine |
| Network | 100Mbps | 1Gbps |
| Storage | 10GB | 50GB (frame buffer) |

**Responsibilities:**
- Connect to each camera's RTSP stream
- De-warp 360° video into viewports (if 360° camera)
- Extract frames at configured FPS (default: 5 FPS per viewport)
- Encode frames as JPEG (quality: 85%)
- Batch frames into groups of 60 (12 seconds of video)
- Publish batches to `edge-buffer` via internal HTTP or Unix socket

**Configuration:**

```yaml
# frame-grabber config (deployed via edge node provisioning)
cameras:
  - id: "cam-001"
    rtsp_url: "rtsp://user:pass@192.168.1.100:554/stream1"
    type: "360"
    fps: 5
    viewports:
      - angle: 0
        name: "front"
      - angle: 90
        name: "right"
      - angle: 180
        name: "back"
      - angle: 270
        name: "left"
    encoding:
      format: "jpeg"
      quality: 85
      resolution: "1920x1080"

  - id: "cam-002"
    rtsp_url: "rtsp://user:pass@192.168.1.101:554/main"
    type: "fixed"
    fps: 10
    encoding:
      format: "jpeg"
      quality: 85
      resolution: "1920x1080"

batch:
  size: 60          # frames per batch
  max_bytes: 52428800  # 50MB max batch size
  timeout_ms: 5000     # flush even if batch not full

logging:
  level: "info"
  format: "json"
```

#### 2. AI Inference (`sentinel360/ai-inference`)

```dockerfile
# Dockerfile.ai-inference
FROM nvcr.io/nvidia/l4t-tensorrt:r8.5.2

RUN apt-get update && apt-get install -y \
    python3-pip python3-numpy python3-opencv \
    && rm -rf /var/lib/apt/lists/*

# Install ONNX Runtime with TensorRT execution provider
RUN pip3 install onnxruntime-gpu==1.16.3 \
    numpy==1.24.3 opencv-python==4.8.1

WORKDIR /app
COPY apps/edge/ai-inference/ .

# Runs multiple models in parallel using TensorRT engines
ENTRYPOINT ["python3", "src/main.py"]
```

| Resource | Request | Limit |
|----------|---------|-------|
| CPU | 2 cores | 4 cores |
| Memory | 4GB | 8GB |
| GPU | 1× Jetson GPU | Full GPU (shared with other containers via MPS) |
| GPU memory | 4GB | 8GB |
| Storage | 5GB | 20GB (model cache) |

**Model Pipeline:**

```
Frame from Frame Grabber
│
├── YOLOv8 (Object Detection)
│   ├── Person detected? → crop → ArcFace (Face Recognition)
│   ├── Vehicle detected? → crop → ALPR (License Plate)
│   └── All detections → Behaviour Analysis
│
├── Behaviour Analysis (Pose Estimation + Tracking)
│   ├── Skeleton keypoints (17-point COCO)
│   ├── Movement vectors
│   └── Anomaly score (falling, running, fighting, loitering)
│
└── Motion Tracking (Deep SORT)
    ├── Object tracklets
    ├── Re-identification embeddings
    └── Scene persistence scoring
```

**Model Specifications:**

| Model | Framework | Input Size | Inference Time (Orin) | Accuracy |
|-------|-----------|------------|----------------------|----------|
| YOLOv8n (detection) | TensorRT FP16 | 640×640 | ~5ms | mAP 50.2% |
| ArcFace (recognition) | TensorRT FP16 | 112×112 | ~8ms | 99.5% LFW |
| ALPR (license plate) | TensorRT FP16 | 320×320 | ~10ms | 96% accuracy |
| PoseNet (behaviour) | TensorRT FP16 | 256×256 | ~15ms | 88% PCK |
| Deep SORT (tracking) | ONNX CPU | Varies | ~2ms | — |

#### 3. Edge Buffer (`sentinel360/edge-buffer`)

```dockerfile
# Dockerfile.edge-buffer
FROM oven/bun:1.3-slim

RUN apt-get update && apt-get install -y \
    curl sqlite3 ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY apps/edge/edge-buffer/ .

# Local buffering + sync manager + Kafka producer + S3 uploader
ENTRYPOINT ["bun", "run", "src/index.ts"]
```

| Resource | Request | Limit |
|----------|---------|-------|
| CPU | 1 core | 2 cores |
| Memory | 1GB | 2GB |
| Storage | 50GB | 200GB (persistent buffer) |
| Network | 50Mbps | 500Mbps (burst during sync) |

**Responsibilities:**
- Receive frames from frame-grabber via local HTTP/Unix socket
- Persist frames to local SQLite database + disk cache
- Enqueue detection events for cloud sync
- Manage Kafka producer connection (send events in real-time when online)
- Manage S3 uploader (send frame batches when online)
- Implement retry logic with exponential backoff
- Track sync state per batch (pending, sending, sent, acked)

### Docker Compose Configuration

```yaml
# /etc/sentinel360/docker-compose.yml
version: "3.8"

services:
  frame-grabber:
    image: ${REGISTRY}/sentinel360-frame-grabber:${VERSION}
    runtime: nvidia
    environment:
      - NODE_ENV=production
      - CONFIG_PATH=/etc/sentinel360/config.yml
      - BUFFER_ENDPOINT=http://edge-buffer:8080
    volumes:
      - /etc/sentinel360/config.yml:/etc/sentinel360/config.yml:ro
      - /etc/sentinel360/certs:/etc/sentinel360/certs:ro
    restart: unless-stopped
    network_mode: "host"
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  ai-inference:
    image: ${REGISTRY}/sentinel360-ai-inference:${VERSION}
    runtime: nvidia
    environment:
      - MODEL_PATH=/models
      - BUFFER_ENDPOINT=http://edge-buffer:8080
      - FRAME_GRABBER_ENDPOINT=http://frame-grabber:8081
      - NVIDIA_VISIBLE_DEVICES=all
    volumes:
      - /etc/sentinel360/models:/models:ro
      - /etc/sentinel360/certs:/etc/sentinel360/certs:ro
    restart: unless-stopped
    network_mode: "host"
    deploy:
      resources:
        reservations:
          devices:
            - capabilities: [gpu]
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  edge-buffer:
    image: ${REGISTRY}/sentinel360-edge-buffer:${VERSION}
    environment:
      - NODE_ENV=production
      - BUFFER_PATH=/data/buffer
      - DB_PATH=/data/sync.db
      - KAFKA_BROKERS=${CLOUD_KAFKA_BROKERS}
      - KAFKA_SSL_CERT=/etc/sentinel360/certs/client.pem
      - KAFKA_SSL_KEY=/etc/sentinel360/certs/client-key.pem
      - S3_ENDPOINT=${CLOUD_S3_ENDPOINT}
      - S3_REGION=${CLOUD_S3_REGION}
      - S3_BUCKET=${CLOUD_S3_BUCKET}
      - HEALTH_ENDPOINT=http://health-agent:9090
    volumes:
      - /data/sentinel360:/data
      - /etc/sentinel360/certs:/etc/sentinel360/certs:ro
    restart: unless-stopped
    network_mode: "host"
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  health-agent:
    image: ${REGISTRY}/sentinel360-health-agent:${VERSION}
    environment:
      - NODE_ENV=production
      - CLOUD_API_ENDPOINT=https://api.sentinel360.io
      - REPORT_INTERVAL_SECONDS=30
      - NODE_ID=${NODE_ID}
    volumes:
      - /etc/sentinel360/certs:/etc/sentinel360/certs:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    restart: unless-stopped
    network_mode: "host"
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## Edge-to-Cloud Connectivity

### Connectivity Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLOUD (AWS/GCP)                              │
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐      │
│  │ MSK Kafka    │    │ S3 (Media    │    │ Cloud API        │      │
│  │ Clusters     │◄───│ Storage)     │◄───│ (REST/gRPC)      │      │
│  │              │    │              │    │                  │      │
│  │ topic:       │    │ sentinel360- │    │ /health          │      │
│  │  detections  │    │  raw-video   │    │ /config          │      │
│  │  frames      │    │              │    │ /sync/ack        │      │
│  │  health      │    │              │    │ /models/update   │      │
│  └──────┬───────┘    └──────┬───────┘    └────────┬─────────┘      │
│         │                   │                     │                 │
│         │          Internet (mTLS + TLS 1.3)       │                 │
│         │                   │                     │                 │
│         │         ┌─────────┴─────────────────────┘                 │
│         │         │         │                                       │
│  ┌──────▼─────────▼─────────▼────────────────────────────────────┐ │
│  │                     EDGE NODE (Jetson Orin)                    │ │
│  │                                                                │ │
│  │  ┌─────────────────────────────────────────────────────────┐  │ │
│  │  │  edge-buffer (Sync Manager)                              │  │ │
│  │  │                                                          │  │ │
│  │  │  ┌──────────────┐   ┌──────────────┐   ┌────────────┐  │  │ │
│  │  │  │ Kafka        │   │ S3 Uploader  │   │ API Client │  │  │ │
│  │  │  │ Producer     │   │ (Multipart)  │   │ (REST)     │  │  │ │
│  │  │  └──────┬───────┘   └──────┬───────┘   └─────┬──────┘  │  │ │
│  │  │         │                  │                  │          │  │ │
│  │  │         └──────────────────┴──────────────────┘          │  │ │
│  │  │                        │                                 │  │ │
│  │  │                   ┌────▼────┐                            │  │ │
│  │  │                   │ Sync    │                            │  │ │
│  │  │                   │ Queue   │                            │  │ │
│  │  │                   │ (SQLite)│                            │  │ │
│  │  │                   └─────────┘                            │  │ │
│  │  └─────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Channels

| Channel | Protocol | Frequency | Data | Priority | Compression |
|---------|----------|-----------|------|----------|-------------|
| **Detection events** | Kafka (MQTT bridge) | Real-time (per frame) | JSON: bounding boxes, embeddings, timestamps | Critical | None (small payloads) |
| **Frame batches** | S3 Multipart Upload | Every 12 seconds | JPEG frames in tar archive | High | Optional: ZIP or lz4 |
| **Video clips** | S3 Multipart Upload | On incident trigger | H.265 encoded clip | High | Hardware H.265 |
| **Health metrics** | HTTPS (REST) | Every 30 seconds | JSON: GPU/CPU/mem/disk/process | Medium | None |
| **Model updates** | HTTPS (REST) | On deployment | ONNX/TensorRT engine files | Low | tarball + gzip |
| **Config updates** | HTTPS (REST) | On change | YAML/JSON config | Low | None |

### Kafka Topic Structure

```yaml
topics:
  - name: "sentinel360.detections"
    partitions: 12
    replication: 3
    retention.ms: 604800000  # 7 days
    compression.type: "lz4"
    config:
      cleanup.policy: "delete"
      min.insync.replicas: 2

  - name: "sentinel360.frames"
    partitions: 24
    replication: 3
    retention.ms: 86400000  # 1 day
    compression.type: "lz4"
    config:
      cleanup.policy: "delete,compact"
      min.insync.replicas: 2

  - name: "sentinel360.health"
    partitions: 6
    replication: 3
    retention.ms: 604800000  # 7 days
    config:
      cleanup.policy: "delete"

  - name: "sentinel360.events"
    partitions: 6
    replication: 3
    retention.ms: 2592000000  # 30 days
    config:
      cleanup.policy: "compact"
```

### Kafka Producer Configuration (Edge)

```typescript
// edge-buffer Kafka producer configuration
const kafkaConfig = {
  clientId: `edge-${nodeId}`,
  brokers: process.env.KAFKA_BROKERS!.split(","),
  ssl: {
    cert: fs.readFileSync("/etc/sentinel360/certs/client.pem"),
    key: fs.readFileSync("/etc/sentinel360/certs/client-key.pem"),
    ca: [fs.readFileSync("/etc/sentinel360/certs/ca.pem")],
    rejectUnauthorized: true,
  },
  // Producer settings for unreliable network
  producer: {
    // Retry configuration
    retry: {
      initialRetryTime: 1000,     // 1 second
      retries: 10,                // Max retries
      maxRetryTime: 30000,        // 30 seconds cap
      factor: 2,                  // Exponential backoff
    },
    // Ensure delivery guarantees
    acks: 1,                      // Leader ack only (faster than all)
    compression: CompressionTypes.GZIP,
    // Buffer for when broker is unreachable
    enableIdempotence: false,     // Disabled to allow retry without ordering
    maxInFlightRequests: 5,
    // Timeout
    timeout: 30000,               // 30 seconds produce timeout
  },
};

// Send with fallback to local buffer
async function publishDetection(detection: DetectionEvent): Promise<void> {
  try {
    await producer.send({
      topic: "sentinel360.detections",
      messages: [{
        key: detection.camera_id,
        value: JSON.stringify(detection),
        timestamp: detection.timestamp,
      }],
    });
    syncStateManager.acknowledge(detection.batchId);
  } catch (err) {
    // Kafka unavailable — buffer locally
    await localBuffer.enqueue("detections", detection);
    syncStateManager.markPending(detection.batchId);
  }
}
```

### S3 Upload Strategy

```typescript
// S3 multipart upload with resume capability
async function uploadFrameBatch(
  batch: FrameBatch,
  uploadId?: string
): Promise<UploadResult> {
  const s3Key = `raw-video/${batch.nodeId}/${batch.cameraId}/` +
    `${batch.timestamp}.tar`;

  // Check if we're resuming a failed upload
  if (!uploadId) {
    uploadId = await s3.createMultipartUpload({
      Bucket: process.env.S3_BUCKET,
      Key: s3Key,
    });
  }

  const parts: CompletedPart[] = [];
  for (const [index, frame] of batch.frames.entries()) {
    const partNumber = index + 1;
    const uploadPartResult = await s3.uploadPart({
      Bucket: process.env.S3_BUCKET,
      Key: s3Key,
      PartNumber: partNumber,
      UploadId: uploadId,
      Body: frame.buffer,
    });
    parts.push({ PartNumber: partNumber, ETag: uploadPartResult.ETag });
  }

  const result = await s3.completeMultipartUpload({
    Bucket: process.env.S3_BUCKET,
    Key: s3Key,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts },
  });

  return { s3Key, etag: result.ETag, size: result.Size };
}
```

---

## Edge Device Provisioning & Management

### Provisioning Workflow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ 1.        │────►│ 2.        │────►│ 3.        │────►│ 4.        │
│ Physical  │     │ Network   │     │ Cloud     │     │ Device    │
│ Install   │     │ Connect + │     │ Register  │     │ Configure │
│           │     │ DHCP      │     │ via API   │     │           │
└──────────┘     └──────────┘     └──────────┘     └────┬─────┘
                                                          │
                                                ┌─────────▼─────────┐
                                                │ 5. Deploy         │
                                                │ Containers +      │
                                                │ Models            │
                                                └─────────┬─────────┘
                                                          │
                                                ┌─────────▼─────────┐
                                                │ 6. Health Check   │
                                                │ Verification      │
                                                └───────────────────┘
```

### Step-by-Step Provisioning

**Phase 1: Hardware Installation**

1. Physically mount Jetson Orin in IP65 enclosure at camera site
2. Connect PoE+ Ethernet from cameras to edge node switch
3. Connect uplink Ethernet (fiber or cellular) to network backhaul
4. Apply power (DC or PoE+)
5. Verify power LED indicator

**Phase 2: Network Connectivity**

The edge node runs a **zero-touch provisioning** script on first boot:

```bash
#!/bin/bash
# /opt/sentinel360/provision.sh — runs on first boot via cloud-init

set -euo pipefail

# 1. Generate unique node identity
NODE_ID=$(cat /sys/devices/virtual/dmi/id/product_uuid | sha256sum | cut -c1-16)

# 2. Generate device key pair for mTLS
openssl ecparam -genkey -name prime256v1 -out /etc/sentinel360/certs/client-key.pem
openssl req -new -key /etc/sentinel360/certs/client-key.pem \
  -out /etc/sentinel360/certs/client.csr \
  -subj "/CN=${NODE_ID}/O=sentinel360-edge"

# 3. Submit CSR to cloud API for signing
RESPONSE=$(curl -s -X POST https://api.sentinel360.io/edge/register \
  -H "Content-Type: application/json" \
  -d "{\"node_id\": \"${NODE_ID}\", \"hardware\": $(cat /proc/device-tree/model | strings)}")

# 4. Write signed certificate
echo "${RESPONSE}" | jq -r '.certificate' > /etc/sentinel360/certs/client.pem
echo "${RESPONSE}" | jq -r '.ca_chain' > /etc/sentinel360/certs/ca.pem

# 5. Write device config
cat > /etc/sentinel360/config.yml <<EOF
node_id: "${NODE_ID}"
cloud_endpoint: "https://api.sentinel360.io"
kafka_brokers: "${RESPONSE}" | jq -r '.kafka_brokers'
s3_bucket: "${RESPONSE}" | jq -r '.s3_bucket'
EOF

# 6. Pull and start containers
docker-compose -f /etc/sentinel360/docker-compose.yml pull
docker-compose -f /etc/sentinel360/docker-compose.yml up -d

# 7. Registration complete
curl -s -X POST https://api.sentinel360.io/edge/registered \
  --cert /etc/sentinel360/certs/client.pem \
  --key /etc/sentinel360/certs/client-key.pem
```

**Phase 3: Cloud Registration**

```typescript
// Cloud-side registration handler
async function registerEdgeNode(req: RegisterRequest): Promise<RegisterResponse> {
  // 1. Validate request
  const nodeId = req.nodeId;
  const hardware = req.hardware;

  // 2. Check for duplicate
  const existing = await db.edgeNode.findByNodeId(nodeId);
  if (existing) throw new ConflictError("Node already registered");

  // 3. Create edge node record
  const node = await db.edgeNode.create({
    nodeId,
    hardwareSpecs: hardware,
    status: "provisioning",
    certificateSerial: generateSerial(),
  });

  // 4. Sign device CSR
  const certificate = await certificateAuthority.signCSR(req.csr, {
    validityDays: 365 * 5,  // 5-year certificate
    allowedRoles: ["edge-node"],
    subject: { cn: nodeId, o: "sentinel360-edge" },
  });

  // 5. Generate initial deployment config
  const config = generateInitialConfig(nodeId);

  // 6. Return signed certificate + config
  return {
    nodeId: node.id,
    certificate: certificate.certPem,
    caChain: certificate.caChainPem,
    kafkaBrokers: config.kafkaBrokers,
    s3Bucket: config.s3Bucket,
  };
}
```

### Lifecycle Management

| State | Description | Transitions |
|-------|-------------|-------------|
| `provisioning` | Initial registration in progress | → `online` (on first heartbeat) |
| `online` | Fully operational, reporting health | → `offline` (heartbeat timeout), → `maintenance` |
| `offline` | No heartbeat for 5+ minutes | → `online` (reconnection), → `decommissioned` |
| `maintenance` | Admin-initiated maintenance mode | → `online` (maintenance complete) |
| `decommissioned` | Retired from service | Terminal state |

### Remote Configuration Updates

```bash
# Push new config to a specific edge node
curl -X PUT https://api.sentinel360.io/edge/${NODE_ID}/config \
  --cert /etc/client.pem \
  --key /etc/client-key.pem \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "cameras": [
        {"id": "cam-001", "fps": 10, "resolution": "1920x1080"}
      ],
      "models": {
        "yolov8": {"confidence_threshold": 0.6},
        "arcface": {"min_face_size": 80}
      }
    },
    "version": 5
  }'

# Edge node polls for config updates every 60 seconds
# Changes are hot-reloaded without container restart where possible
```

### Model Deployment Pipeline

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ MLflow   │────►│ Model    │────►│ Download │────►│ Validate │
│ Promotes │     │ Registry │     │ from S3  │     │ SHA-256  │
│ Version  │     │ triggers │     │ to Edge  │     │ Hash     │
└──────────┘     └──────────┘     └──────────┘     └────┬─────┘
                                                          │
                                                ┌─────────▼─────────┐
                                                │ Load into         │
                                                │ Inference Engine  │
                                                │ (hot-reload)      │
                                                └─────────┬─────────┘
                                                          │
                                                ┌─────────▼─────────┐
                                                │ Run Validation    │
                                                │ Inference         │
                                                └─────────┬─────────┘
                                                ┌─────────▼─────────┐
                                                │ Pass?             │
                                                │  YES → Set Active │
                                                │  NO → Rollback    │
                                                └───────────────────┘
```

---

## Offline Tolerance & Sync Strategy

### Offline Architecture

Edge nodes are designed to operate **autonomously** during cloud connectivity loss. All critical functions continue locally:

```
CONNECTED MODE                        OFFLINE MODE
┌────────────────────┐               ┌────────────────────┐
│                    │               │                    │
│  Real-time Kafka   │   ─── loss    │  Local SQLite      │
│  + S3 upload       │   ───►       │  buffer (disk)     │
│                    │               │                    │
│  Cloud-dependent   │               │  Full local        │
│  operations        │               │  operation         │
│                    │               │                    │
│  Health streaming  │               │  Buffered health   │
│  to cloud          │               │  logs              │
└────────────────────┘               └────────────────────┘
         ▲                                    │
         │            connection              │
         └──────────── restored ──────────────┘
                         │
                         ▼
               ┌────────────────────┐
               │  SYNC MODE         │
               │                    │
               │  Catch-up:         │
               │  • Drain local     │
               │    buffer queue    │
               │  • Upload missed   │
               │    frame batches   │
               │  • Reconcile       │
               │    health metrics  │
               └────────────────────┘
```

### Buffer Management

```typescript
// Local buffer architecture using SQLite + disk cache

interface BufferRecord {
  id: string;
  batchId: string;
  dataType: "detection" | "frame" | "video_clip" | "health";
  payload: Buffer;
  createdAt: Date;
  retryCount: number;
  lastRetryAt: Date | null;
  checksum: string;  // SHA-256
}

class LocalBuffer {
  private db: Database;
  private diskCache: DiskCache;
  private maxSize: number;  // 100GB default
  private watermark: number; // 80% — trigger alert

  async enqueue(type: string, data: Buffer): Promise<void> {
    // 1. Compute checksum
    const checksum = createHash("sha256").update(data).digest("hex");

    // 2. Persist to SQLite
    const record = await this.db.insert({
      id: uuidv7(),
      dataType: type,
      checksum,
      createdAt: Date.now(),
    });

    // 3. Write payload to disk cache
    await this.diskCache.write(record.id, data);

    // 4. Check buffer pressure
    await this.checkPressure();
  }

  private async checkPressure(): Promise<void> {
    const usage = await this.getDiskUsage();
    if (usage > this.watermark * this.maxSize) {
      // Trigger alert — buffer near capacity
      await this.healthAgent.reportWarning("buffer_high_usage", {
        usagePercent: (usage / this.maxSize) * 100,
      });

      // Apply QoS: drop lowest-priority data (health logs first)
      if (usage > 0.95 * this.maxSize) {
        await this.evictLowPriority();
      }
    }
  }

  private async evictLowPriority(): Promise<void> {
    // Delete oldest health records first
    await this.db.delete()
      .where({ dataType: "health" })
      .orderBy("createdAt")
      .limit(1000);
  }
}
```

### Sync Protocol

When connectivity is restored, the edge node initiates a **catch-up sync**:

```
Edge Node                           Cloud
    │                                 │
    │  1. POST /sync/init             │
    │     {lastAckedBatch: "..."}     │
    │────────────────────────────────►│
    │                                 │
    │  2. 200 OK                      │
    │     {syncId: "...",             │
    │      expectedSeq: [...]}        │
    │◄────────────────────────────────│
    │                                 │
    │  3. POST /sync/batch            │
    │     (batched records)           │
    │────────────────────────────────►│
    │                                 │
    │  4. 200 OK                      │
    │     {ack: batchId,              │
    │      checksum_valid: true}      │
    │◄────────────────────────────────│
    │                                 │
    │  (repeat 3-4 until buffer       │
    │   is drained)                   │
    │                                 │
    │  5. POST /sync/complete         │
    │     {syncId: "..."}             │
    │────────────────────────────────►│
    │                                 │
    │  6. Sync complete — resume      │
    │     real-time mode              │
```

### Sync Configuration

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Sync trigger | Immediate on reconnect | Minimise data lag |
| Batch size | 100 records or 50MB | Balance throughput vs latency |
| Max parallelism | 3 concurrent uploads | Avoid saturating limited bandwidth |
| Retry backoff | 1s, 2s, 4s, 8s, 30s cap | Polite retry for unstable connections |
| Checksum verification | SHA-256 per batch | End-to-end integrity |
| Resume support | Yes (track last acked batch) | No re-upload on failure |
| Sync timeout | 5 minutes per batch | Prevent stuck syncs |
| Total sync timeout | 24 hours | Eventually consistent |

### Offline Data Retention Policy

| Data Type | Max Offline Retention | Action on Overflow |
|-----------|----------------------|-------------------|
| Detection events | 30 days | Oldest dropped (FIFO) |
| Frame batches | 7 days | Oldest dropped (FIFO) |
| Video clips (incident) | 90 days | Protected — never dropped |
| Health metrics | 7 days | Oldest dropped first |
| Model updates | Until applied | Never dropped — critical |

---

## Health Monitoring & Alerting

### Health Agent Architecture

The **health-agent** container runs on every edge node and is responsible for collecting, reporting, and optionally acting on health metrics.

```typescript
// Health agent — runs every 30 seconds
async function collectAndReport(): Promise<void> {
  const metrics = await Promise.all([
    collectGPUmetrics(),     // nvidia-smi equivalent
    collectCPUmetrics(),     // /proc/stat
    collectMemoryMetrics(),  // /proc/meminfo
    collectDiskMetrics(),    // df
    collectNetworkMetrics(), // /proc/net/dev
    collectProcessHealth(),  // Docker container status
    collectCameraHealth(),   // RTSP stream status
    collectInferenceMetrics(), // Model latency, FPS
  ]);

  const healthReport = {
    nodeId: process.env.NODE_ID,
    timestamp: new Date().toISOString(),
    metrics: Object.assign({}, ...metrics),
    uptime: os.uptime(),
    containers: await getContainerStatuses(),
    cameras: await getCameraStreamStatuses(),
    bufferUsage: await getBufferUsage(),
  };

  // 1. Evaluate local thresholds — act immediately
  const alerts = evaluateThresholds(healthReport);
  for (const alert of alerts) {
    await executeLocalAction(alert);
  }

  // 2. Report to cloud (with local buffer fallback)
  try {
    await httpPost(
      "https://api.sentinel360.io/edge/health",
      healthReport,
      { cert: CLIENT_CERT, key: CLIENT_KEY }
    );
  } catch {
    await localBuffer.enqueue("health", healthReport);
  }

  // 3. Publish to Kafka (real-time stream)
  try {
    await kafkaProducer.send({
      topic: "sentinel360.health",
      messages: [{ value: JSON.stringify(healthReport) }],
    });
  } catch {
    // Already buffered above
  }
}
```

### Health Metrics Collected

| Category | Metrics | Collection Method | Frequency |
|----------|---------|-------------------|-----------|
| **GPU** | Utilization %, temperature °C, memory used/total MB, power draw W, clock speed MHz | `nvidia-smi` via NVIDIA Management Library | Every 30s |
| **CPU** | Utilization % per core, load average (1/5/15m), context switches | `/proc/stat`, `/proc/loadavg` | Every 30s |
| **Memory** | Used/total/available MB, swap usage, OOM score | `/proc/meminfo` | Every 30s |
| **Disk** | Used/total GB per mount, I/O ops, read/write latency | `df`, `/proc/diskstats` | Every 60s |
| **Network** | Bytes sent/received, packets dropped, retransmits, link speed | `/proc/net/dev`, `ethtool` | Every 60s |
| **Containers** | Status (running/stopped), restarts, CPU/mem per container | Docker API via socket | Every 30s |
| **Cameras** | Stream connected/disconnected, FPS actual vs expected, frame drops | RTSP `ffprobe` health check | Every 60s |
| **Inference** | Per-model latency p50/p95/p99, FPS, queue depth, model version | Inference engine metrics endpoint | Every 30s |
| **Buffer** | Used/total bytes, record count, oldest record age, sync lag | SQLite query + disk usage | Every 60s |

### Health Report Schema

```json
{
  "nodeId": "edge-abc123",
  "timestamp": "2026-06-13T14:30:00.000Z",
  "uptime": 604800,
  "status": "online",
  "metrics": {
    "gpu": {
      "utilization_pct": 67.2,
      "temperature_c": 72.4,
      "memory_used_mb": 6144,
      "memory_total_mb": 8192,
      "power_watt": 28.5
    },
    "cpu": {
      "utilization_pct": 45.1,
      "load_1m": 2.3,
      "load_5m": 1.8,
      "load_15m": 1.5
    },
    "memory": {
      "used_mb": 12288,
      "total_mb": 32768,
      "available_mb": 18000,
      "swap_used_mb": 256
    },
    "disk": {
      "root_used_gb": 42.5,
      "root_total_gb": 256,
      "buffer_used_gb": 18.3,
      "buffer_total_gb": 200,
      "buffer_records": 15000,
      "oldest_record_hours": 2.3
    },
    "network": {
      "bytes_sent_total": 1073741824,
      "bytes_received_total": 2147483648,
      "packets_dropped_pct": 0.02,
      "link_speed_mbps": 1000
    },
    "containers": {
      "frame-grabber": "running",
      "ai-inference": "running",
      "edge-buffer": "running",
      "health-agent": "running"
    },
    "cameras": [
      {
        "cameraId": "cam-001",
        "connected": true,
        "expected_fps": 5.0,
        "actual_fps": 4.98,
        "frames_dropped": 12,
        "stream_latency_ms": 150
      }
    ],
    "inference": {
      "yolov8": {
        "model_version": "v2.3.1",
        "latency_p50_ms": 5.2,
        "latency_p95_ms": 8.1,
        "latency_p99_ms": 12.3,
        "fps": 48.5
      },
      "arcface": {
        "model_version": "v1.8.0",
        "latency_p50_ms": 7.8,
        "latency_p95_ms": 11.2,
        "latency_p99_ms": 15.9,
        "fps": 32.1
      }
    }
  },
  "alerts_active": [
    {
      "type": "high_gpu_temp",
      "severity": "warning",
      "message": "GPU temperature 72.4°C exceeds warning threshold (70°C)",
      "since": "2026-06-13T14:25:00.000Z"
    }
  ]
}
```

### Threshold Evaluation & Local Actions

| Metric | Warning Threshold | Critical Threshold | Local Action |
|--------|-------------------|--------------------|--------------|
| GPU temperature | > 70°C | > 85°C | Reduce power mode (critical) |
| GPU utilization | > 90% for 5min | > 95% for 5min | Throttle frame rate |
| Memory usage | > 80% | > 90% | Restart low-priority containers |
| Disk buffer usage | > 80% | > 95% | Evict oldest non-critical data |
| Inference latency (p95) | > 2× baseline | > 5× baseline | Fall back to less accurate but faster model |
| Camera FPS drop | > 10% below expected | > 50% below expected | Restart frame grabber |
| Consecutive sync failures | > 5 | > 20 | Throttle retry, reduce data quality |
| Container restart | > 3 in 10 minutes | > 5 in 10 minutes | Power cycle container |

### Alert Routing

| Severity | Cloud Channel | Edge Action | Response Time |
|----------|--------------|-------------|---------------|
| **Critical** | PagerDuty + Slack #incidents | Automatic mitigation (throttle/restart) | < 5 minutes |
| **High** | Slack #edge-alerts + email | Log warning, prepare mitigation | < 15 minutes |
| **Warning** | Slack #edge-health | Log only | < 1 hour |
| **Info** | Log only | None | Next business day |

### Edge Node Dashboard (Grafana)

A dedicated Grafana dashboard for edge infrastructure includes:

- **Map View**: Geographic placement of all edge nodes with status indicators (green/red/yellow)
- **Node Summary Cards**: Each node showing status, uptime, GPU temp, inference FPS, buffer usage
- **Drill-down View**: Per-node detail with time-series charts for all health metrics
- **Camera Grid**: Thumbnail tiles showing latest frame from each camera
- **Alert Timeline**: Recent alerts across all nodes
- **Sync Status**: Per-node sync lag, last sync time, pending records

---

## Security Architecture

### Edge Security Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Defence-in-Depth for Edge Nodes                  │
│                                                                      │
│  Layer 1: Physical Security                                          │
│  ├── Tamper-evident enclosure seals                                  │
│  ├── Locked enclosure (keyed alike per site)                         │
│  └── Secure mounting (anti-theft bolts)                              │
│                                                                      │
│  Layer 2: OS Security                                                │
│  ├── Ubuntu 22.04 with CIS benchmark hardening                       │
│  ├── AppArmor profiles for all containers                            │
│  ├── Read-only root filesystem (squashfs)                            │
│  ├── No SSH passwords — key-only + MFA                               │
│  └── Automatic security updates (unattended-upgrades)                │
│                                                                      │
│  Layer 3: Container Security                                         │
│  ├── All images signed (Cosign) and scanned (Trivy)                  │
│  ├── Containers run as non-root user                                  │
│  ├── Read-only root filesystem (--read-only)                         │
│  ├── Capabilities dropped (--cap-drop=ALL)                           │
│  └── Resource limits enforced (CPU, memory, GPU)                     │
│                                                                      │
│  Layer 4: Network Security                                           │
│  ├── All cloud traffic over mTLS (TLS 1.3, mutual auth)              │
│  ├── Camera traffic isolated on dedicated VLAN                       │
│  ├── No inbound ports open (outbound-only connections)                │
│  └── DNS over TLS for all resolution                                 │
│                                                                      │
│  Layer 5: Data Security                                              │
│  ├── All data encrypted at rest (LUKS on /data partition)            │
│  ├── All data encrypted in transit (mTLS + Kafka SSL)                │
│  ├── Sensitive data (faces, plates) masked in local logs              │
│  └── Automatic data purge on decommission                            │
└─────────────────────────────────────────────────────────────────────┘
```

### mTLS Certificate Management

| Certificate | Purpose | Validity | Renewal |
|-------------|---------|----------|---------|
| **Device identity cert** | mTLS client auth | 5 years | Manual (re-provision) |
| **Kafka SSL cert** | Kafka producer auth | 1 year | Automatic (cert-manager-like) |
| **API client cert** | REST API auth | 1 year | Automatic |
| **CA certificate** | Trust anchor | 10 years | Manual rotation |

### Certificate Renewal

```bash
# Automatic certificate renewal (runs daily via systemd timer)
#!/bin/bash
# /opt/sentinel360/renew-certs.sh

CERT_DIR="/etc/sentinel360/certs"
CA_ENDPOINT="https://ca.sentinel360.io"

# Check if certificate expires within 30 days
openssl x509 -checkend $((30 * 86400)) -in ${CERT_DIR}/client.pem
if [ $? -ne 0 ]; then
  # Generate new CSR
  openssl req -new \
    -key ${CERT_DIR}/client-key.pem \
    -out /tmp/client.csr \
    -subj "/CN=${NODE_ID}/O=sentinel360-edge"

  # Submit CSR for renewal
  RESPONSE=$(curl -s -X POST ${CA_ENDPOINT}/renew \
    --cert ${CERT_DIR}/client.pem \
    --key ${CERT_DIR}/client-key.pem \
    -H "Content-Type: application/json" \
    -d "{\"csr\": \"$(cat /tmp/client.csr | base64)\"}")

  # Write new certificate
  echo "${RESPONSE}" | jq -r '.certificate' > ${CERT_DIR}/client.pem
  echo "${RESPONSE}" | jq -r '.ca_chain' > ${CERT_DIR}/ca.pem

  # Restart containers that use the certificate
  docker-compose -f /etc/sentinel360/docker-compose.yml restart edge-buffer
fi
```

---

## Operating Procedures

### Initial Site Deployment Checklist

- [ ] Site survey completed (power, network coverage, camera mounting points)
- [ ] Edge node enclosure mounted and secured
- [ ] Network connectivity verified (speed test: >50Mbps upload)
- [ ] Camera(s) mounted, focused, and connected to edge node switch
- [ ] Power applied to edge node (verify power LED status)
- [ ] Network link LED shows connected
- [ ] Edge node appears in cloud dashboard (status: provisioning → online)
- [ ] Camera streams verified (frames appearing in dashboard)
- [ ] AI inference verified (detections appearing in test feed)
- [ ] Health metrics reporting (check Grafana dashboard)
- [ ] Sync test completed (upload test batch, verify in S3)
- [ ] Provisioning ticket closed

### Routine Maintenance

| Task | Frequency | Duration | Impact |
|------|-----------|----------|--------|
| Review health dashboard | Daily | 15 min | None |
| Clean enclosure vents | Monthly | 30 min per node | Brief offline |
| Verify camera focus/alignment | Monthly | 15 min per camera | None (live stream) |
| Review buffer usage trends | Weekly | 15 min | None |
| Apply OS security patches | Bi-weekly | 5 min reboot | ~2 min offline |
| Model accuracy audit | Monthly | 1 hour | None (shadow mode) |
| Certificate expiry review | Monthly | 10 min | None |
| Full system backup | Quarterly | 30 min | None |
| Firmware update | Bi-annually | 1 hour per node | ~5 min offline |
| Decommission audit | Annually | 2 hours | None |

### Troubleshooting Guide

| Symptom | Likely Cause | Check | Resolution |
|---------|-------------|-------|------------|
| Edge node shows offline | Power loss or network outage | Check power LED, link LED, ping from site | Site visit if persistent |
| Camera stream down | Camera power loss or RTSP failure | Check camera PoE LED, test RTSP with `ffprobe` | Reboot camera via PoE cycle |
| No detections appearing | AI inference crash or model failure | Check `docker logs ai-inference`, GPU metrics | Restart container |
| Buffer filling up | Sync failure or cloud connectivity loss | Check `edge-buffer` logs, Kafka connection | Resolve network; manual sync trigger |
| GPU temperature high | Ambient temp or cooling blockage | Check temp trend in Grafana, inspect vents | Reduce power mode; clean vents |
| Container restart loop | Config error or OOM | `docker logs <container>`, check resource limits | Fix config; increase resource limits |
| Certificate expired | Auto-renewal failure | Check cert expiry with `openssl` | Manual cert renewal |
| Sync stalled | Kafka endpoint unreachable | Test connectivity to Kafka brokers | Update firewall rules; restart edge-buffer |

### Emergency Shutdown & Restart

```bash
# Graceful shutdown (preserves all buffered data)
ssh edge-node-001
sudo /opt/sentinel360/shutdown.sh

# Emergency restart
sudo reboot

# Factory reset (decommission — wipes all data)
sudo /opt/sentinel360/factory-reset.sh

# After restart, verify:
# 1. All containers running: docker ps
# 2. Camera streams active: docker logs frame-grabber --tail=10
# 3. Health reporting: journalctl -u health-agent -n 20
# 4. Sync state: curl http://localhost:8080/sync/status
```

### Decommission Procedure

```bash
# 1. Notify cloud of decommission
curl -X POST https://api.sentinel360.io/edge/${NODE_ID}/decommission \
  --cert /etc/sentinel360/certs/client.pem \
  --key /etc/sentinel360/certs/client-key.pem

# 2. Stop all containers
docker-compose -f /etc/sentinel360/docker-compose.yml down

# 3. Secure wipe of all data (LUKS re-encrypt)
sudo cryptsetup luksFormat /dev/sda1
sudo dd if=/dev/urandom of=/dev/sda1 bs=4M status=progress

# 4. Clear TLS certificates
sudo rm -rf /etc/sentinel360/certs

# 5. Revoke device certificate in cloud CA
# → Performed automatically on decommission API call
```

---

## Appendices

### A. Network Ports & Protocols

| Direction | Port | Protocol | Purpose | Encrypted |
|-----------|------|----------|---------|-----------|
| Edge → Cloud | 443 | HTTPS (TLS 1.3) | REST API, health reports | Yes |
| Edge → Cloud | 9093 | Kafka (SSL) | Event streaming | Yes |
| Edge → Cloud | 443 | HTTPS (mTLS) | S3 uploads | Yes |
| Edge → Cloud | 123 | NTP | Time synchronisation | No (signed) |
| Edge ← Cloud | 443 | HTTPS (mTLS) | Config/model updates | Yes |
| Edge → Camera | 554 | RTSP (TCP) | Video stream ingestion | Optional (Digest auth) |
| Edge → Camera | 80/443 | HTTP(S) | Camera management API | Optional |
| Edge (local) | 8080 | HTTP | Internal container comms | No (localhost only) |
| Edge (local) | 9090 | HTTP | Health agent endpoint | No (localhost only) |

### B. Bandwidth Estimation

| Component | Per Camera | 4 Cameras | 8 Cameras |
|-----------|------------|-----------|-----------|
| RTSP stream (H.265, 4K, 5 FPS) | 8 Mbps | 32 Mbps | 64 Mbps |
| Frame batches to cloud (JPEG, 5 FPS) | 20 Mbps | 80 Mbps | 160 Mbps |
| Detection events (JSON, per-frame) | 0.5 Mbps | 2 Mbps | 4 Mbps |
| Health metrics (every 30s) | — | 0.01 Mbps | 0.01 Mbps |
| Model updates (infrequent) | — | 0 Mbps (burst) | 0 Mbps (burst) |
| **Total uplink** | **~28.5 Mbps** | **~114 Mbps** | **~228 Mbps** |

> **Recommendation:** Deploy with minimum 100 Mbps dedicated uplink (4 cameras) or 500 Mbps (8+ cameras). Consider 5G/LTE failover with QoS that prioritises detection events over frame batches during bandwidth contention.

### C. Edge Node Bill of Materials

| Component | Part Number | Estimated Cost | Lifespan |
|-----------|-------------|---------------|----------|
| Jetson Orin AGX 32GB | 945-14050-0000-000 | $1,200 | 5 years |
| IP65 Enclosure | Custom fabricated | $350 | 10 years |
| PoE+ Switch (4-port) | TP-Link TL-SG1005P | $80 | 5 years |
| UPS / Supercapacitor module | Custom | $150 | 5 years |
| Antennas (Wi-Fi + cellular) | Various | $60 | 5 years |
| Cabling & connectors | Various | $100 | 10 years |
| 5G/LTE modem (optional) | Quectel RM520N-GL | $200 | 5 years |
| **Total per node (4 cameras)** | | **$2,140** | |

### D. Edge Node Configuration Reference

```yaml
# /etc/sentinel360/config.yml — full reference
node_id: "edge-abc123"
name: "Site-42 - Cape Town Waterfront"
location:
  latitude: -33.9035
  longitude: 18.4216

cloud:
  api_endpoint: "https://api.sentinel360.io"
  kafka_brokers: "kafka-1.sentinel360.io:9093,kafka-2.sentinel360.io:9093"
  s3:
    endpoint: "https://s3.sentinel360.io"
    region: "us-east-1"
    bucket: "sentinel360-raw-video"
  health_endpoint: "https://api.sentinel360.io/edge/health"

power_mode: "balanced"  # balanced | maxn | performance

cameras:
  - id: "cam-001"
    name: "Panoramic Roof Cam"
    rtsp_url: "rtsp://192.168.1.100:554/stream1"
    type: "360"
    fps: 5
    viewports:
      - angle: 0
        name: "front"
      - angle: 90
        name: "right"
      - angle: 180
        name: "back"
      - angle: 270
        name: "left"
    roi: null  # region of interest (polygon)
    encoding:
      format: "jpeg"
      quality: 85
      resolution: "1920x1080"

models:
  yolov8:
    enabled: true
    version: "v2.3.1"
    confidence_threshold: 0.5
    iou_threshold: 0.45
    classes: ["person", "vehicle", "animal", "bag"]
  arcface:
    enabled: true
    version: "v1.8.0"
    min_face_size: 80
    similarity_threshold: 0.6
  alpr:
    enabled: true
    version: "v3.1.0"
    min_plate_size: 60
    ocr_confidence_threshold: 0.7
  behaviour:
    enabled: true
    version: "v1.2.0"
    anomaly_threshold: 0.8
    actions: ["running", "fighting", "falling", "loitering"]

buffer:
  path: "/data/buffer"
  max_size_gb: 200
  watermark_pct: 80
  retention_days:
    detections: 30
    frames: 7
    video_clips: 90
    health: 7

sync:
  enabled: true
  interval_seconds: 30
  batch_size: 100
  max_parallel: 3
  retry:
    initial_delay_ms: 1000
    max_delay_ms: 30000
    max_retries: 10
  bandwidth_limit_mbps: 500

health:
  report_interval_seconds: 30
  thresholds:
    gpu_temp_warning: 70
    gpu_temp_critical: 85
    gpu_util_warning: 90
    mem_usage_warning: 80
    mem_usage_critical: 90
    buffer_usage_warning: 80
    buffer_usage_critical: 95
    inference_latency_warning: 2.0  # × baseline
    inference_latency_critical: 5.0
    camera_fps_drop_warning: 10  # percent
    camera_fps_drop_critical: 50

logging:
  level: "info"
  format: "json"
  max_files: 3
  max_size_mb: 10
```

---

**DevOps Automator:** [DevOps Engineer]  
**Infrastructure Date:** June 2026  
**Edge Platform:** NVIDIA Jetson Orin AGX 32GB  
**Edge OS:** Ubuntu 22.04 LTS (ARM64) + Docker 24+  
**Connectivity:** mTLS to cloud via Kafka + S3 + REST  
**Offline Mode:** Full autonomous operation with local buffering  
**Models:** YOLOv8, ArcFace, ALPR, Behaviour Analysis (TensorRT FP16)
