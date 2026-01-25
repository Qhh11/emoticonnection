
import asyncio
import websockets
import json
import os
import argparse
import time

async def test_live_voice(uri, input_file, output_file):
    print(f"🚀 Connecting to Real-time Voice WebSocket: {uri}")
    
    if not os.path.exists(input_file):
        print(f"❌ Input file not found: {input_file}")
        return

    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected to Backend")
            
            # Read input audio (should be 16kHz PCM or similar as expected by backend)
            with open(input_file, 'rb') as f:
                audio_data = f.read()
            
            # Open output file for received audio
            out_f = open(output_file, 'wb')
            
            print(f"📤 Sending audio data ({len(audio_data)} bytes) in chunks...")
            
            # Simulate streaming by sending small chunks
            chunk_size = 3200 # 0.1s of 16kHz 16-bit mono PCM
            
            async def send_audio():
                for i in range(0, len(audio_data), chunk_size):
                    chunk = audio_data[i:i + chunk_size]
                    await websocket.send(chunk)
                    # print(f"Sent chunk {i//chunk_size}")
                    await asyncio.sleep(0.1) # Simulate real-time
                print("📤 Finished sending audio data.")

            async def receive_response():
                print("📥 Waiting for AI response...")
                try:
                    while True:
                        msg = await websocket.recv()
                        if isinstance(msg, bytes):
                            # print(f"📥 Received audio chunk ({len(msg)} bytes)")
                            out_f.write(msg)
                        else:
                            data = json.loads(msg)
                            if data.get("type") == "text":
                                print(f"🤖 AI (Text): {data.get('content')}", end="", flush=True)
                            elif data.get("type") == "turn_complete":
                                print("\n✅ AI Turn complete.")
                                break
                            elif data.get("type") == "interrupted":
                                print("\n⚠️ AI Interrupted.")
                except Exception as e:
                    print(f"\n❌ Receiver error: {e}")

            # Run sender and receiver
            await asyncio.gather(send_audio(), receive_response())
            
            out_f.close()
            print(f"💾 AI response audio saved to: {output_file}")
            print("✨ Test complete.")

    except Exception as e:
        print(f"❌ Connection/Test error: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test Real-time Voice WebSocket")
    parser.add_argument("--url", default="ws://localhost:8000/ws/gemini-live", help="WebSocket URI")
    parser.add_argument("--input", required=True, help="Path to input 16kHz PCM audio file")
    parser.add_argument("--output", default="ai_response_live.raw", help="Path to save output 24kHz PCM audio file")
    
    args = parser.parse_args()
    
    asyncio.run(test_live_voice(args.url, args.input, args.output))
