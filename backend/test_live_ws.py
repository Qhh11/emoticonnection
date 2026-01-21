
import asyncio
import websockets
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_connection():
    uri = "ws://localhost:8000/ws/gemini-live"
    logger.info(f"Connecting to {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            logger.info("✅ Connected successfully to Backend WebSocket")
            
            # Send a dummy JSON message to verify protocol handling
            test_msg = json.dumps({"text": "Hello, is the connection working?"})
            await websocket.send(test_msg)
            logger.info(f"📤 Sent test message: {test_msg}")
            
            # Wait for a brief moment to see if connection stays open or if we get an immediate error/response
            # Note: We might not get a text response immediately if the model expects audio, 
            # but we want to ensure valid handshake and no immediate closure.
            try:
                # Set a timeout for receiving; initially we might just get silence or no response without audio input
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                logger.info(f"reponse: {response}")
            except asyncio.TimeoutError:
                logger.info("⏳ No immediate response (expected if waiting for audio), but connection is stable.")
            
            logger.info("✅ Connection test passed. Closing connection.")
            
    except ConnectionRefusedError:
        logger.error("❌ Connection Refused: Is the backend server running at localhost:8000?")
    except Exception as e:
        logger.error(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())
