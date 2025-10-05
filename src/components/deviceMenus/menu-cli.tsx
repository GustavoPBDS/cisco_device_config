import { useScenario } from "@/contexts/scenario.context";
import useCiscoCli from "@/hooks/useCLI";
import { NetworkDeviceData } from "@/interfaces/devices";
import { X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Node } from "reactflow";

interface IProps {
    onClose: () => void
    node: Node<NetworkDeviceData>
}

const COMMON_COMMANDS = [
    'enable', 'disable', 'show running-config', 'show version',
    'configure terminal', 'conf t', 'exit', 'hostname', 'interface', 'vlan', 'ip address', 'no shutdown', 'shutdown',
    'copy running-config startup-config', 'write memory', 'clear', 'help', 'device', 'cls', 'clear screen'
];

export default function MenuCLI({ node, onClose }: IProps) {

    const terminalRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const { lines, input, setInput, onKeyDown, prompt } = useCiscoCli(node);

    useEffect(() => {
        terminalRef.current && (terminalRef.current.scrollTo({ top: terminalRef.current.scrollHeight, behavior: 'smooth' }));
    }, [lines]);

    return (
        <>
            <div className="w-[95vw] max-w-lg max-h-[70vh] flex flex-col flex-1 divide-zinc-400 p-4 pb-13 rounded-lg bg-gray-800 fixed left-2.5 top-2.5 z-10">
                <div className="flex items-center justify-between max-w-screen z-20 pb-2 border-b-2 border-b-gray-600">

                    <h3 >CLI do dispositivo:
                        <span className="font-bold">
                            {` ${node.data.label}`}
                        </span>
                    </h3>

                    <span onClick={onClose}
                        className="cursor-pointer"
                    >
                        <X />
                    </span>

                </div>
                <div
                    className="w-full overflow-y-scroll scrollbar-thumb-rounded-full scrollbar-track-rounded-full scrollbar scrollbar-thumb-slate-500 scrollbar-track-transparent"
                    onClick={() => inputRef.current?.focus()}
                    ref={terminalRef}
                >

                    <div className="overflow-auto" style={{ minHeight: 390 }}>
                        {lines.map((l, i) => (
                            <pre key={i} className="whitespace-pre-wrap">{l}</pre>
                        ))}
                    </div>

                    <div className="w-11/12 mt-auto flex items-center absolute bottom-2.5 border-b border-sky-800">
                        <label htmlFor="input-command" className="pr-2 text-sky-300">{prompt()}</label>
                        <input
                            ref={inputRef}
                            value={input}
                            id='input-command'
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={onKeyDown}
                            className="flex-1 bg-gray-800/80 text-sky-200 outline-none py-1"
                            autoFocus
                        />
                    </div>
                </div>
            </div>
        </>
    );
}
