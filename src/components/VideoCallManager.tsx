import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { 
  Video, VideoOff, Mic, MicOff, Phone, PhoneOff, 
  RefreshCw, User, Loader2, AlertCircle, CheckCircle2, 
  Volume2, VolumeX, Sparkles, Monitor
} from 'lucide-react';

interface VideoCallManagerProps {
  initialCallTarget: { id: string; username: string } | null;
  onClose: () => void;
}

export default function VideoCallManager({ initialCallTarget, onClose }: VideoCallManagerProps) {
  const { user, token } = useAuth();
  
  // Call status of local client
  // 'idle' | 'calling' | 'ringing' | 'connected' | 'ended'
  const [callState, setCallState] = useState<'idle' | 'calling' | 'ringing' | 'connected' | 'ended'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Connection details
  const [callId, setCallId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<{ id: string; username: string } | null>(null);
  const [isCaller, setIsCaller] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('Initializing...');
  
  // Audio/Video mute controls
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoOff, setIsVideoOff] = useState<boolean>(false);
  
  // Stream tracking
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isFallbackStream, setIsFallbackStream] = useState<boolean>(false);

  // HTML Video Elements refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  
  // WebRTC structures
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const canvasAnimIntervalRef = useRef<any>(null);
  const fallbackAudioOscRef = useRef<any>(null);
  
  // Polling intervals refs
  const invitePollIntervalRef = useRef<any>(null);
  const callStatePollIntervalRef = useRef<any>(null);
  const signalPollIntervalRef = useRef<any>(null);

  // Constants
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  // CLEAN UP EVERYTHING when unmounting or completing calls
  const cleanupMediaAndCalls = () => {
    // 1. Terminate streams
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    setLocalStream(null);
    setRemoteStream(null);
    setIsFallbackStream(false);

    // 2. Clear anim canvas/oscillators
    if (canvasAnimIntervalRef.current) {
      clearInterval(canvasAnimIntervalRef.current);
      canvasAnimIntervalRef.current = null;
    }
    if (fallbackAudioOscRef.current) {
      try {
        fallbackAudioOscRef.current.stop();
      } catch (e) {}
      fallbackAudioOscRef.current = null;
    }

    // 3. Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // 4. Clear polling routines
    if (callStatePollIntervalRef.current) {
      clearInterval(callStatePollIntervalRef.current);
      callStatePollIntervalRef.current = null;
    }
    if (signalPollIntervalRef.current) {
      clearInterval(signalPollIntervalRef.current);
      signalPollIntervalRef.current = null;
    }
  };

  // End active call session
  const endCall = async (notifyServer = true) => {
    if (callId && token && notifyServer) {
      try {
        await fetch(`/api/video-calls/${callId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status: isCaller ? 'completed' : 'completed' })
        });
      } catch (err) {
        console.error("Failed to notify server of call terminaton:", err);
      }
    }
    cleanupMediaAndCalls();
    setCallState('ended');
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  // Generate simulated test patterns for cameras on VM environment or blocked permissions
  const createFallbackMediaStream = (): MediaStream => {
    setIsFallbackStream(true);
    setConnectionStatus("Hardware stream offline. Activating dynamic workspace simulator...");
    
    // Canvas animation stream
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d')!;
    
    let ringRadius = 0;
    let textYOffset = 0;
    
    canvasAnimIntervalRef.current = setInterval(() => {
      // Background gradient
      const grad = ctx.createRadialGradient(320, 240, 50, 320, 240, 350);
      grad.addColorStop(0, '#1c1c1a');
      grad.addColorStop(1, '#0c0c0b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 480);
      
      // Animated grid pattern
      ctx.strokeStyle = '#E4E3E0';
      ctx.globalAlpha = 0.05;
      ctx.lineWidth = 1;
      for (let x = 0; x < 640; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 480);
        ctx.stroke();
      }
      for (let y = 0; y < 480; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(640, y);
        ctx.stroke();
      }
      
      // Dynamic radar rings
      ringRadius = (ringRadius + 2) % 180;
      ctx.strokeStyle = '#fbbf24'; // amber-400
      ctx.globalAlpha = (1 - ringRadius / 180) * 0.4;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(320, 240, ringRadius, 0, 2 * Math.PI);
      ctx.stroke();
      
      // Secondary wave
      const ring2 = (ringRadius + 90) % 180;
      ctx.strokeStyle = '#34d399'; // emerald-400
      ctx.globalAlpha = (1 - ring2 / 180) * 0.3;
      ctx.beginPath();
      ctx.arc(320, 240, ring2, 0, 2 * Math.PI);
      ctx.stroke();
      
      // Stylized Center glyph
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(320, 240, 15, 0, 2 * Math.PI);
      ctx.fill();
      
      // Stylized UI indicators
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = '#e4e3e0';
      ctx.font = '11px ui-monospace, JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`TRANSITIONAL ALIGNMENT INTERFACE`, 320, 100);
      
      ctx.font = 'italic serif 18px Georgia, Playfair Display';
      ctx.fillStyle = '#f5f5f4';
      ctx.fillText(`${user?.username || 'Reentry Peer'} (Local Stream)`, 320, 200);
      
      // Dynamic code simulator lines
      ctx.font = '10px ui-monospace, JetBrains Mono, monospace';
      ctx.fillStyle = '#10b981'; // emerald-500
      ctx.fillText(`[SIGNALING CHANNEL] OK // LATENCY: ~20ms`, 320, 340);
      ctx.fillStyle = '#6b7280';
      ctx.fillText(`RTC Peer Connection // STUN Enabled // Audio Synthesizer Running`, 320, 360);
      
      // Subtle watermark animation
      textYOffset = Math.sin(Date.now() / 300) * 4;
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`● PEER TO PEER SIMU-FEED`, 320, 130 + textYOffset);
    }, 45); // ~22 fps
    
    const canvasStream = (canvas as any).captureStream ? (canvas as any).captureStream(24) : null;
    
    // Synthesize dummy silent audio feed using web audio context
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const dest = audioCtx.createMediaStreamDestination();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime); // standard diagnostic pitch
    gainNode.gain.setValueAtTime(0.000001, audioCtx.currentTime); // barely audible silence to act as mock track
    osc.connect(gainNode);
    gainNode.connect(dest);
    osc.start();
    fallbackAudioOscRef.current = osc; // save reference to dispose
    
    // Assemble composite stream
    const tracks: MediaStreamTrack[] = [];
    if (canvasStream && canvasStream.getVideoTracks().length > 0) {
      tracks.push(canvasStream.getVideoTracks()[0]);
    }
    if (dest.stream.getAudioTracks().length > 0) {
      tracks.push(dest.stream.getAudioTracks()[0]);
    }
    
    return new MediaStream(tracks);
  };

  // INITIALIZE WEBRTC PEER CONNECTION
  const setupPeerConnection = (stream: MediaStream) => {
    if (!otherUser || !callId) return;
    
    setConnectionStatus("Aligning network channels...");
    
    const pc = new RTCPeerConnection(iceServers);
    peerConnectionRef.current = pc;
    
    // Add local tracks to peer connection
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });
    
    // Listen for incoming remote tracks
    pc.ontrack = (event) => {
      setConnectionStatus("Direct media stream aligned!");
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };
    
    // Gather ice candidates and post them
    pc.onicecandidate = async (event) => {
      if (event.candidate && token && callId) {
        try {
          await fetch('/api/video-signals', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              callId,
              receiverId: otherUser.id,
              type: 'ice-candidate',
              payload: JSON.stringify(event.candidate)
            })
          });
        } catch (err) {
          console.error("Error posting ice candidate signal:", err);
        }
      }
    };
    
    // Connection health visual reporting
    pc.onconnectionstatechange = () => {
      console.log("P2P connection state update:", pc.connectionState);
      if (pc.connectionState === 'connected') {
        setConnectionStatus("Connected // Encrypted peer-to-peer");
      } else if (pc.connectionState === 'failed') {
        setConnectionStatus("P2P path blocked. Attempting router workaround...");
      } else if (pc.connectionState === 'disconnected') {
        setConnectionStatus("Peer left or coverage dropped.");
      }
    };
  };

  // PLACING CALL ROUTINE (CALLER FLOW)
  const placeOutgoingCall = async (targetId: string, targetName: string) => {
    if (!token) return;
    try {
      setCallState('calling');
      setOtherUser({ id: targetId, username: targetName });
      setIsCaller(true);
      setConnectionStatus("Capturing local camera and microphone...");

      // Capture client media stream with error safety fallback
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 }, 
          audio: true 
        });
      } catch (err) {
        console.warn("Hardware camera capture failed. Injecting safe simulator stream.", err);
        mediaStream = createFallbackMediaStream();
      }
      setLocalStream(mediaStream);

      // Create video call on backend
      const response = await fetch('/api/video-calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ receiverId: targetId })
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to catalog call session");
      }

      const callData = await response.json();
      const newCallId = callData.callId;
      setCallId(newCallId);

      // We need callId and otherUser set to begin peer connection
      // For immediate setup, invoke inline or handle in a ref. Let's do it using state fields safely
      
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to make call.");
      setCallState('idle');
    }
  };

  // RECEIVING/ANSWERING FLOW (CALLEE FLOW)
  const answerIncomingCall = async (incomingCall: any) => {
    if (!token) return;
    try {
      setCallState('connected');
      setIsCaller(false);
      setCallId(incomingCall.id);
      setOtherUser({ id: incomingCall.caller_id, username: incomingCall.caller_name });
      setConnectionStatus("Answering call... Accessing cameras...");

      // Capture local client stream
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 }, 
          audio: true 
        });
      } catch (err) {
        console.warn("Hardware capture failed on receiver. Injecting safe simulator stream.", err);
        mediaStream = createFallbackMediaStream();
      }
      setLocalStream(mediaStream);

      // Inform server of connecting state
      await fetch(`/api/video-calls/${incomingCall.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'connected' })
      });

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to accept the video call.");
      endCall(true);
    }
  };

  // Decline/Reject Incoming call
  const declineIncomingCall = async (incomingCall: any) => {
    if (!token) return;
    try {
      await fetch(`/api/video-calls/${incomingCall.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'declined' })
      });
    } catch (e) {
      console.error(e);
    }
    setCallState('idle');
  };

  // INCOMING CALL DISCOVERY (POLLER RUNNING IN BACKGROUND FOR IDLE SESSIONS)
  useEffect(() => {
    if (!token || callState !== 'idle') return;

    const findIncomingCalls = async () => {
      try {
        const res = await fetch('/api/video-calls/active', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        
        if (data.call && data.call.status === 'ringing') {
          // Double check which party we are: we are receiver if receiver_id matches current user
          if (data.call.receiver_id === user?.id) {
            setCallId(data.call.id);
            setOtherUser({ id: data.call.caller_id, username: data.call.caller_name });
            setCallState('ringing');
          }
        }
      } catch (err) {
        console.error("Error polling incoming call status:", err);
      }
    };

    // Poll every 3 seconds
    invitePollIntervalRef.current = setInterval(findIncomingCalls, 3000);
    // Trigger immediately on join
    findIncomingCalls();

    return () => {
      if (invitePollIntervalRef.current) {
        clearInterval(invitePollIntervalRef.current);
        invitePollIntervalRef.current = null;
      }
    };
  }, [token, callState, user?.id]);

  // ACTIVATE TRIPLE FEEDBACK ROUTINE FOR CALLS IN PROGRESS
  // Set up peer connections once we have a Call ID, Target, and Local Capture Stream
  useEffect(() => {
    if (!callId || !otherUser || !localStream || !token) return;

    // Build the RTCPeerConnection structure
    setupPeerConnection(localStream);
    const pc = peerConnectionRef.current!;

    // Create SDP Offer if we are the Caller
    const createOfferDraft = async () => {
      try {
        setConnectionStatus("Forming peer coordinates...");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        await fetch('/api/video-signals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            callId,
            receiverId: otherUser.id,
            type: 'offer',
            payload: JSON.stringify(offer)
          })
        });
        setConnectionStatus("Streaming coordinates... Awaiting peer response...");
      } catch (err) {
        console.error("Failed to generate or send offer", err);
      }
    };

    if (isCaller) {
      createOfferDraft();
    }

    // A: POLL CALL STATUS REGULARLY
    const checkCallStatus = async () => {
      try {
        const res = await fetch(`/api/video-calls/${callId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        
        // Handle rejection or completed
        if (data.status === 'declined') {
          setConnectionStatus("Call declined by recipient.");
          endCall(false);
        } else if (data.status === 'completed') {
          setConnectionStatus("Session finished.");
          endCall(false);
        } else if (data.status === 'connected' && callState === 'calling') {
          setCallState('connected');
        }
      } catch (e) {
        console.error("Error retrieving call session:", e);
      }
    };

    // B: POLL INCOMING SIGNALS REGULARLY (Offers, answers, ICE candidates)
    const checkInboxSignals = async () => {
      try {
        const res = await fetch(`/api/video-signals/${callId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const signals = await res.json();
        
        for (const signal of signals) {
          const payloadParsed = JSON.parse(signal.payload);
          
          if (signal.type === 'offer' && !isCaller) {
            setConnectionStatus("Received coordinates... Handshaking peer...");
            await pc.setRemoteDescription(new RTCSessionDescription(payloadParsed));
            
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            await fetch('/api/video-signals', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                callId,
                receiverId: otherUser.id,
                type: 'answer',
                payload: JSON.stringify(answer)
              })
            });
            setConnectionStatus("Coordinates matched! Connecting audio/video lines...");
          } 
          else if (signal.type === 'answer' && isCaller) {
            setConnectionStatus("Coordinates matched! Initializing feeds...");
            await pc.setRemoteDescription(new RTCSessionDescription(payloadParsed));
          } 
          else if (signal.type === 'ice-candidate') {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payloadParsed));
            } catch (err) {
              console.warn("Failed to apply candidate track. Skipping candidate...", err);
            }
          }
        }
      } catch (err) {
        console.error("Error consumption signals loop:", err);
      }
    };

    callStatePollIntervalRef.current = setInterval(checkCallStatus, 1500);
    signalPollIntervalRef.current = setInterval(checkInboxSignals, 1200);

    return () => {
      if (callStatePollIntervalRef.current) clearInterval(callStatePollIntervalRef.current);
      if (signalPollIntervalRef.current) clearInterval(signalPollIntervalRef.current);
    };
  }, [callId, otherUser, localStream, isCaller]);


  // TRIGGER AUTOMATIC OUTGOING CALL WHEN LAUNCHED FROM PARENT TAB
  useEffect(() => {
    if (initialCallTarget && callState === 'idle') {
      placeOutgoingCall(initialCallTarget.id, initialCallTarget.username);
    }
  }, [initialCallTarget]);

  // Hook Streams to <video> Nodes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, localVideoRef.current]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, remoteVideoRef.current]);

  // Track buttons actions
  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(t => t.enabled = isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(t => t.enabled = isVideoOff);
      setIsVideoOff(!isVideoOff);
    }
  };


  // --- RENDERING VIEWS ---

  // Retain pristine visual craftsmanship: if idle, do not render any container overlays
  if (callState === 'idle') return null;

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-[#141414] border-2 border-[#E4E3E0] text-[#E4E3E0] max-w-4xl w-full flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* Call Panel Header */}
        <header className="border-b border-[#E4E3E0]/20 p-4 flex justify-between items-center bg-black/40">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping shrink-0" />
            <span className="text-[10px] font-mono tracking-widest font-bold uppercase text-amber-400">
              Live Mentorship Stream // Encrypted Channel
            </span>
          </div>
          <span className="text-xs font-mono text-zinc-500">
            CID: {callId ? callId.substring(0, 8).toUpperCase() : 'SEARCHING...'}
          </span>
        </header>

        {/* Core Media Room */}
        <div className="p-6 flex-1 min-h-[400px] flex flex-col justify-between">
          
          {/* Incoming Call Dialog Overlay */}
          {callState === 'ringing' && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-8 text-center p-12">
              <div className="w-24 h-24 rounded-full border border-amber-400 flex items-center justify-center bg-amber-400/5 animate-pulse">
                <User size={48} className="text-amber-400" />
              </div>
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase tracking-widest text-[#E4E3E0]/60">Incoming Call Invitation</span>
                <h3 className="text-4xl font-serif italic text-white font-bold">{otherUser?.username}</h3>
                <p className="text-sm text-zinc-400 max-w-md mx-auto">
                  Your peer mentorship connection wants to start a browser-to-browser peer video consultation.
                </p>
              </div>

              {/* Accept / Decline triggers */}
              <div className="flex gap-4 justify-center w-full pt-4">
                <button
                  onClick={() => answerIncomingCall({ id: callId, caller_id: otherUser?.id, caller_name: otherUser?.username })}
                  className="bg-emerald-500 text-white hover:bg-emerald-600 px-6 py-3 font-mono font-bold uppercase text-xs tracking-widest transition-all cursor-pointer flex items-center gap-2 rounded-sm"
                >
                  <Video size={16} /> Accept Consult
                </button>
                <button
                  onClick={() => declineIncomingCall({ id: callId })}
                  className="border border-[#E4E3E0]/20 hover:border-red-400 hover:text-red-400 px-6 py-3 font-mono font-bold uppercase text-xs tracking-widest transition-all cursor-pointer flex items-center gap-2 rounded-sm"
                >
                  <PhoneOff size={16} /> Decline
                </button>
              </div>
            </div>
          )}

          {/* Outgoing Ringing Screen */}
          {callState === 'calling' && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-8 text-center p-12">
              <div className="w-20 h-20 rounded-full border border-dashed border-[#E4E3E0]/40 flex items-center justify-center bg-white/5 animate-spin">
                <RefreshCw size={32} className="text-[#E4E3E0]/40 animate-pulse" />
              </div>
              <div className="space-y-2">
                <span className="text-xs font-mono uppercase tracking-widest text-amber-400">{connectionStatus}</span>
                <h3 className="text-4xl font-serif italic text-white font-bold">{otherUser?.username}</h3>
                <p className="text-sm text-zinc-400">
                  Ringing peer client. They must be on the Mentorship page to inherit the signal.
                </p>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => endCall(true)}
                  className="border border-red-500/40 text-red-400 hover:bg-red-500 hover:text-white px-6 py-3 font-mono font-bold uppercase text-xs tracking-widest transition-all cursor-pointer flex items-center gap-2 rounded-sm"
                >
                  <PhoneOff size={16} /> Cancel Invitation
                </button>
              </div>
            </div>
          )}

          {/* Ended Call Screen */}
          {callState === 'ended' && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center">
              <CheckCircle2 size={48} className="text-amber-400" />
              <div className="space-y-1">
                <h3 className="text-2xl font-serif italic font-bold">Call Concluded</h3>
                <p className="text-xs font-mono text-zinc-500">Transitional Consult Logged // Connection Clear</p>
              </div>
            </div>
          )}

          {/* Active Call Mode */}
          {callState === 'connected' && (
            <div className="flex-1 flex flex-col space-y-6">
              
              {/* Dynamic Connection status tag */}
              <div className="bg-black/60 border border-[#E4E3E0]/10 px-4 py-2 flex items-center justify-between text-xs font-mono">
                <span className="text-[#E4E3E0]/60 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Status: {connectionStatus}
                </span>
                {isFallbackStream && (
                  <span className="text-amber-400 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                    <Monitor size={12} /> Live Canvas Sim Mode Active
                  </span>
                )}
              </div>

              {/* Double Feeds video frame */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                
                {/* Local Camera stream */}
                <div className="relative bg-zinc-900 border border-[#E4E3E0]/15 aspect-video overflow-hidden flex items-center justify-center">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  
                  {/* Local video label */}
                  <div className="absolute top-3 left-3 bg-black/70 border border-white/10 px-2 py-0.5 rounded-sm text-[10px] uppercase font-mono font-bold">
                    You {isVideoOff ? '(Video Muted)' : ''}
                  </div>

                  {isVideoOff && (
                    <div className="absolute inset-0 bg-neutral-900 flex flex-col items-center justify-center text-center p-4">
                      <VideoOff size={40} className="text-zinc-600 mb-2" />
                      <p className="text-xs font-mono opacity-55">Your camera feed is turned off</p>
                    </div>
                  )}
                </div>

                {/* Remote Peer stream */}
                <div className="relative bg-zinc-900 border border-[#E4E3E0]/15 aspect-video overflow-hidden flex items-center justify-center">
                  {remoteStream ? (
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-neutral-900 flex flex-col items-center justify-center text-center p-6 space-y-4">
                      <div className="w-12 h-12 rounded-full border border-dashed border-amber-400 flex items-center justify-center bg-amber-400/5 animate-pulse">
                        <Loader2 size={24} className="text-amber-400 animate-spin" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-mono text-[#E4E3E0] uppercase tracking-wider font-bold">Connecting network feed...</p>
                        <p className="text-[10px] text-zinc-500 max-w-xs mx-auto">
                          WebRTC handshakes established. Waiting for remote video stream node capture...
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Remote user name overlay */}
                  <div className="absolute top-3 left-3 bg-black/70 border border-white/10 px-2 py-0.5 rounded-sm text-[10px] uppercase font-mono font-bold">
                    {otherUser?.username} (Remote Peer)
                  </div>
                </div>

              </div>

              {/* Floating controls panel */}
              <div className="bg-black/40 border border-[#E4E3E0]/10 p-4 flex flex-wrap gap-4 items-center justify-between">
                
                {/* Audio/Video Quick Toggles */}
                <div className="flex gap-2">
                  <button
                    onClick={toggleMute}
                    className={`p-3 border rounded transition-all cursor-pointer flex items-center justify-center ${
                      isMuted 
                        ? 'bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20' 
                        : 'border-[#E4E3E0]/20 hover:border-[#E4E3E0] hover:bg-white/5'
                    }`}
                    title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                  >
                    {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                  <button
                    onClick={toggleCamera}
                    className={`p-3 border rounded transition-all cursor-pointer flex items-center justify-center ${
                      isVideoOff 
                        ? 'bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20' 
                        : 'border-[#E4E3E0]/20 hover:border-[#E4E3E0] hover:bg-white/5'
                    }`}
                    title={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
                  >
                    {isVideoOff ? <VideoOff size={16} /> : <Video size={16} />}
                  </button>
                </div>

                {/* Call Diagnostics / Quick Information */}
                <div className="hidden sm:flex text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                  STUN: stun.l.google.com // Mode: Peer-to-Peer
                </div>

                {/* Hang up controller */}
                <button
                  onClick={() => endCall(true)}
                  className="bg-red-600 hover:bg-red-700 text-white font-mono font-bold uppercase tracking-widest text-xs py-3 px-6 rounded-sm transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <Phone size={16} className="rotate-[135deg]" /> Hang Up
                </button>

              </div>

            </div>
          )}
          
          {/* Diagnostic Err alerts */}
          {errorMessage && (
            <div className="mt-4 bg-red-950/20 border border-red-500/30 p-3 flex items-center gap-2 text-xs text-red-300">
              <AlertCircle size={14} className="shrink-0" />
              <span>Diagnostic Warning: {errorMessage}</span>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
