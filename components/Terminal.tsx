import React, { useState, useEffect, useRef } from 'react';
import { TerminalLine, TerminalCommandType } from '../types';
import { queryCyberAI } from '../services/geminiService';
import { TERMINAL_CONFIG } from '../constants';

const INITIAL_LINES: TerminalLine[] = [
  ...TERMINAL_CONFIG.bootLines.map((line: string, i: number) => ({
    id: `init-${i}`,
    type: 'system' as const,
    content: line,
    timestamp: new Date()
  })),
  {
    id: 'init-welcome',
    type: 'output',
    content: (
      <span>
        {TERMINAL_CONFIG.welcome.line1} <span className="text-neon-pink">{TERMINAL_CONFIG.welcome.osName}</span> {TERMINAL_CONFIG.welcome.version}.<br/>
        {TERMINAL_CONFIG.welcome.line2} <span className="text-neon-cyan">'{TERMINAL_CONFIG.welcome.commandHelp}'</span> {TERMINAL_CONFIG.welcome.line3}
      </span>
    ),
    timestamp: new Date()
  }
];

export const Terminal: React.FC = () => {
  const [history, setHistory] = useState<TerminalLine[]>(INITIAL_LINES);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleCommand = async (cmdString: string) => {
    const trimmed = cmdString.trim();
    if (!trimmed) return;

    const parts = trimmed.split(' ');
    const cmd = parts[0].toUpperCase();
    const args = parts.slice(1).join(' ');

    const newEntry: TerminalLine = {
      id: Date.now().toString(),
      type: 'input',
      content: trimmed,
      timestamp: new Date()
    };
    
    setHistory(prev => [...prev, newEntry]);
    setIsProcessing(true);

    let responseContent: React.ReactNode | string = '';
    let responseType: TerminalLine['type'] = 'output';

    switch (cmd) {
      case TerminalCommandType.HELP:
        responseContent = (
          <div className="grid grid-cols-1 gap-1 text-sm">
            {TERMINAL_CONFIG.commands.help.map((item: any, idx: number) => (
              <div key={idx}><span className="text-neon-cyan">{item.cmd}</span> {item.desc}</div>
            ))}
          </div>
        );
        break;
      case TerminalCommandType.CLEAR:
        setHistory([]);
        setIsProcessing(false);
        return;
      case TerminalCommandType.ABOUT:
        responseContent = TERMINAL_CONFIG.commands.about;
        break;
      case TerminalCommandType.CONTACT:
        responseContent = TERMINAL_CONFIG.commands.contact;
        break;
      case TerminalCommandType.PROJECTS:
        responseContent = TERMINAL_CONFIG.commands.projects;
        break;
      case TerminalCommandType.AI:
        if (!args) {
          responseContent = TERMINAL_CONFIG.messages.aiMissingParam;
          responseType = 'error';
        } else {
          // Add a loading indicator
          setHistory(prev => [...prev, {
            id: 'loading-' + Date.now(),
            type: 'system',
            content: <span className="animate-pulse">{TERMINAL_CONFIG.messages.aiLoading}</span>,
            timestamp: new Date()
          }]);
          
          const aiResponse = await queryCyberAI(args);
          
          // Remove loading indicator (filter out the specific loading id)
          setHistory(prev => {
             const withoutLoading = prev.filter(l => !l.id.startsWith('loading-'));
             return [...withoutLoading, {
               id: Date.now().toString() + '-ai',
               type: 'output',
               content: <span className="text-neon-purple">{aiResponse}</span>,
               timestamp: new Date()
             }];
          });
          setIsProcessing(false);
          return; // Return early as we updated history manually
        }
        break;
      default:
        responseContent = `${TERMINAL_CONFIG.messages.unknownCommand} '${cmd}'. Try '${TERMINAL_CONFIG.welcome.commandHelp}'.`;
        responseType = 'error';
    }

    setHistory(prev => [...prev, {
      id: Date.now().toString() + '-res',
      type: responseType,
      content: responseContent,
      timestamp: new Date()
    }]);
    setIsProcessing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isProcessing) {
      handleCommand(input);
      setInput('');
    }
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="w-full h-full min-h-[500px] bg-black/80 border border-gray-800 rounded-sm backdrop-blur-sm flex flex-col relative overflow-hidden shadow-[0_0_20px_rgba(0,255,255,0.1)]" onClick={focusInput}>
      {/* Terminal Header */}
      <div className="h-8 bg-gray-900 border-b border-gray-700 flex items-center px-4 justify-between select-none">
        <div className="text-xs text-gray-500 font-mono">{TERMINAL_CONFIG.user}</div>
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-900/50 border border-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-900/50 border border-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-900/50 border border-green-500"></div>
        </div>
      </div>

      {/* Terminal Body */}
      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-sm space-y-2 custom-scrollbar"
      >
        {history.map(line => (
          <div key={line.id} className={`${line.type === 'error' ? 'text-red-500' : line.type === 'system' ? 'text-gray-500' : line.type === 'input' ? 'text-gray-300' : 'text-neon-cyan'}`}>
            <div className="flex gap-2 items-start">
               <span className="text-gray-600 shrink-0 select-none pt-[1px]">
                 {line.type === 'input' ? '>' : line.type === 'system' ? '#' : ''}
               </span>
               <div className="break-words leading-relaxed">
                 {line.content}
               </div>
            </div>
          </div>
        ))}
        
        {/* Input Line */}
        <div className="flex gap-2 text-neon-pink items-center">
          <span className="shrink-0 select-none pb-[2px]">{'>'}</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent outline-none border-none text-neon-pink placeholder-gray-700 caret-neon-cyan py-0"
            placeholder={isProcessing ? "PROCESSING..." : "Enter command..."}
            disabled={isProcessing}
            autoComplete="off"
          />
        </div>
      </div>
      
      {/* Decorative scanline overlay specifically for terminal */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20"></div>
    </div>
  );
};
