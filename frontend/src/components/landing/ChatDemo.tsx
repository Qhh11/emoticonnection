import { useState, useEffect, useRef } from 'react'

interface Message {
  id: number
  sender: 'A' | 'B'
  text: string
  emotion?: {
    label: string
    emoji: string
    color: string
  }
}

const CHAT_DATA: Message[] = [
  {
    id: 1,
    sender: 'A',
    text: "I've been hunting for the 'Neon Dream' secret figure for weeks!",
    emotion: { label: 'Excitement', emoji: '🤩', color: 'bg-pink-500' }
  },
  {
    id: 2,
    sender: 'B',
    text: "Did you check the flagship store? They just restocked."
  },
  {
    id: 3,
    sender: 'A',
    text: "I went there this morning and they were already sold out again...",
    emotion: { label: 'Sadness', emoji: '😢', color: 'bg-indigo-500' }
  },
  {
    id: 4,
    sender: 'A',
    text: "Why is it so hard to get just one?! I'm literally so annoyed right now.",
    emotion: { label: 'Anger', emoji: '😠', color: 'bg-red-500' }
  },
  {
    id: 5,
    sender: 'B',
    text: "Wait... don't be mad. Check your front porch."
  },
  {
    id: 6,
    sender: 'A',
    text: "NO WAY! You actually found one for me?! You are the best friend ever!",
    emotion: { label: 'Happiness', emoji: '😊', color: 'bg-purple-500' }
  },
  {
    id: 7,
    sender: 'A',
    text: "I've been stressed about this all day, I'm exhausted but so happy.",
    emotion: { label: 'Fatigue', emoji: '😴', color: 'bg-orange-500' }
  },
]

export default function ChatDemo() {
  const [visibleMessages, setVisibleMessages] = useState<Message[]>([])
  const [index, setIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Smoothly scroll to the bottom whenever a new message is added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [visibleMessages, index])

  // Simulate incoming messages
  useEffect(() => {
    const timer = setTimeout(() => {
      if (index < CHAT_DATA.length) {
        setVisibleMessages(prev => [...prev, CHAT_DATA[index]])
        setIndex(index + 1)
      } else {
        // Long pause before looping to simulate a real conversation flow
        setTimeout(() => {
          setVisibleMessages([])
          setIndex(0)
        }, 6000)
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [index])

  return (
    <div className="relative z-20 bg-white/95 backdrop-blur-2xl rounded-[3rem] p-2 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] border border-white/60 animate-float h-[600px] flex flex-col overflow-hidden w-full max-w-[450px] mx-auto lg:mx-0">
      {/* Fixed Header */}
      <div className="flex-none p-6 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-100">AI</div>
          <div>
            <p className="font-black text-sm leading-none text-gray-800">Vibe Check</p>
            <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest mt-1">Analysis Active</p>
          </div>
        </div>
        <div className="flex space-x-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400 opacity-60"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 opacity-60"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-400 opacity-60"></div>
        </div>
      </div>

      {/* Dynamic Scrollable Chat Area */}
      <div
        ref={scrollRef}
        className="flex-1 p-6 space-y-6 overflow-y-auto transition-all duration-500 scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          .flex-1::-webkit-scrollbar { display: none; }
        ` }} />

        {visibleMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end space-x-3 animate-message-slide ${msg.sender === 'B' ? 'flex-row-reverse space-x-reverse' : ''}`}
          >
            {/* User Avatar */}
            <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center text-white font-black text-sm shadow-md transition-all duration-300 hover:scale-110 hover:shadow-lg ${msg.sender === 'A' ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-gradient-to-br from-blue-500 to-cyan-500'}`}>
              {msg.sender}
            </div>

            <div className={`max-w-[85%] space-y-2 ${msg.sender === 'B' ? 'items-end flex flex-col' : 'items-start flex flex-col'}`}>
              {/* Message Bubble */}
              <div className={`p-4 rounded-[1.5rem] shadow-sm font-bold text-sm leading-relaxed transition-all duration-300 hover:shadow-md ${msg.sender === 'B' ? 'bg-[#1a1a1a] text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
                {msg.text}
              </div>

              {/* Emotion Analysis Tag */}
              {msg.emotion && (
                <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full ${msg.emotion.color} text-white shadow-lg animate-emotion-pop border-2 border-white/20`}>
                  <span className="text-sm drop-shadow-sm">{msg.emotion.emoji}</span>
                  <span className="text-[9px] font-black uppercase tracking-[0.15em]">{msg.emotion.label}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Real-time Thinking Indicator */}
        {index < CHAT_DATA.length && index > 0 && (
          <div className="flex items-center space-x-1.5 pl-12 py-2 animate-message-slide">
            <div className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce shadow-sm"></div>
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s] shadow-sm"></div>
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s] shadow-sm"></div>
          </div>
        )}
      </div>

      {/* Fixed Footer Input */}
      <div className="flex-none p-6 border-t border-gray-50 flex items-center space-x-3 bg-white/50">
         <div className="flex-1 h-12 bg-gray-50 border border-gray-100 rounded-2xl px-5 flex items-center text-gray-400 text-sm font-bold italic">
           Type your vibe...
         </div>
         <div className="w-12 h-12 bg-[#1a1a1a] rounded-2xl flex items-center justify-center shadow-xl transition-transform hover:scale-105 active:scale-95 group">
           <svg className="w-5 h-5 text-white transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="currentColor">
             <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
           </svg>
         </div>
      </div>
    </div>
  )
}
