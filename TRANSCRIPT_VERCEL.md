# YouTube Transcript on Vercel - Solutions

## Problem
The `/get-transcript/:videoId` endpoint uses `youtube-dl-exec` which requires Python 3.10+. Vercel's serverless environment may not have a compatible Python version.

## Current Status

### Local Development ✅
- **Works**: Uses `yt-dlp` with Python 3.12 from Homebrew
- **Path**: `/opt/homebrew/bin/python3.12`
- **Auto-fixed**: The `postinstall` script (`scripts/fix-ytdlp.js`) automatically updates the yt-dlp shebang

### Vercel Deployment ❌
- **Problem**: The hardcoded Python path won't exist on Vercel's Linux environment
- **Issue**: Vercel's default Python might be < 3.10

## Solutions for Vercel

### Option 1: Use External API (Recommended ⭐)
Use a dedicated YouTube transcript API service:

```bash
npm install @distube/ytdl-core
# or
npm install youtubei.js
```

**Pros:**
- No Python dependency
- Works reliably on serverless
- Pure JavaScript

**Cons:**
- May have rate limits
- Depends on external service

### Option 2: Deploy Python Layer
Create a separate Python-based endpoint:

1. Create a Python function in `api/transcript.py`:
```python
from yt_dlp import YoutubeDL
from http.server import BaseHTTPRequestHandler
import json

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        video_id = self.path.split('/')[-1]
        ydl_opts = {
            'skip_download': True,
            'writesubtitles': True,
            'writeautomaticsub': True,
        }
        
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f'https://youtube.com/watch?v={video_id}', download=False)
            
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(info.get('subtitles', {})).encode())
```

2. Add to `requirements.txt`:
```
yt-dlp>=2024.0.0
```

3. Update `vercel.json`:
```json
{
  "functions": {
    "api/transcript.py": {
      "runtime": "python3.12"
    }
  }
}
```

**Pros:**
- Same `yt-dlp` library
- Full control

**Cons:**
- Requires Python runtime configuration
- More complex deployment

### Option 3: Use Fallback Strategy (Current Implementation)
The endpoint now tries multiple methods:

1. First: Try `youtube-transcript` (pure JS, but may fail)
2. Fallback: Use `yt-dlp` (works locally, may fail on Vercel)

**Pros:**
- Works locally guaranteed
- May work on Vercel if Python is available

**Cons:**
- Unreliable on Vercel
- May silently fail

### Option 4: Use a Proxy Service
Deploy `yt-dlp` on a dedicated server (Fly.io, Railway, etc.) and call it from Vercel:

```javascript
app.get("/get-transcript/:videoId", async (req, res) => {
  const response = await fetch(`https://your-ytdlp-service.fly.dev/transcript/${req.params.videoId}`);
  const data = await response.json();
  res.json(data);
});
```

**Pros:**
- Full Python environment control
- Can use latest `yt-dlp`
- Scales independently

**Cons:**
- Additional infrastructure
- Network latency

## Recommended Approach

For production on Vercel, use **Option 1** or **Option 4**:

### Quick Implementation (Option 1)

```bash
npm install youtubei.js
```

```javascript
import { Innertube } from 'youtubei.js';

app.get("/get-transcript/:videoId", async (req, res) => {
  try {
    const youtube = await Innertube.create();
    const info = await youtube.getInfo(req.params.videoId);
    const transcriptData = await info.getTranscript();
    
    const formatted = transcriptData.transcript.content.body.initial_segments.map(segment => ({
      start: segment.start_ms / 1000,
      text: segment.snippet.runs.map(run => run.text).join('')
    }));
    
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Testing

### Local
```bash
npm run dev
curl http://localhost:3000/get-transcript/dQw4w9WgXcQ
```

### Vercel
```bash
vercel dev  # Test locally with Vercel environment
vercel deploy  # Deploy to preview
```

## Environment Variables

If using Option 2 or 4, you may need:

```
TRANSCRIPT_SERVICE_URL=https://your-service.com
YOUTUBE_API_KEY=your_key  # if using YouTube Data API
```

## Notes

- The current yt-dlp solution works perfectly locally with the postinstall script
- For Vercel, you need one of the alternative approaches above
- Consider rate limits and Terms of Service when choosing a solution
