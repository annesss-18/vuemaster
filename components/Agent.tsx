import { cn } from '@/lib/utils';
import Image from 'next/image'
import { ca } from 'zod/v4/locales';

enum CallStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  CONNECTING = 'CONNECTING',
  FINISHED = 'FINISHED'
}
const Agent = ({ userName }: AgentProps) => {
  const callStatus = CallStatus.FINISHED; // Example state, replace with actual logic
  const isSpeaking = true; // Example state, replace with actual logic
  const messages = ['Whats your name?', 'My name is John Doe, nice to meet you!', 'How can I help you today?']; // Example state, replace with actual logic
  const lastMessage = messages[messages.length - 1] || '';

  return (
    <>
      <div className="call-view">
        <div className="card-interviewer">
          <div className="avatar">
            <Image src="/ai-avatar.png" alt="vapi" width={65} height={65} className="object-cover" />
            {isSpeaking && <span className="animate-speak"></span>}
          </div>
          <h3>AI Interviewer</h3>
        </div>
        <div className="card-border">
          <div className="card-content">
            <Image src="/user-avatar.png" alt="user" width={540} height={540} className="rounded-full object-cover size-[120px]" />
            <h3>{userName}</h3>
          </div>
        </div>
      </div>

      {
        messages.length > 0 && (
          <div className="transcript-border">
            <div className="transcript">
              <p key={lastMessage} className="{cn('transition-opacity' duration-500 opacity-0', animate-fade-in opacity-100')}">
                {lastMessage}
              </p>
            </div>
          </div>
        )
      }
      <div className="w-full flex justify-center">
        {
          callStatus !== 'ACTIVE' ? (
            <button className="relative btn-call">
              <span className={cn("absolute rounded-full opacity-75 animate-ping", callStatus !== 'CONNECTING' & 'hidden')} />
              <span>
                {callStatus === 'INACTIVE' || callStatus === 'FINISHED' ? 'Start Call' : '...'}
              </span>
            </button>
          ) : (
            <button className="btn-disconnet">
              End
            </button>
          )
        }
      </div>
    </>
  )
}

export default Agent