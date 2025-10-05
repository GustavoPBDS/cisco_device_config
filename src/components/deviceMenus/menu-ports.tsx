import { useScenario } from '@/contexts/scenario.context';
import { NetworkDeviceData } from '@/interfaces/devices';
import React, { useCallback } from 'react';
import { Node } from 'reactflow';

type PortMenuProps = {
    node: Node<NetworkDeviceData>;
    onSelectPort: (nodeId: string, port: string) => void;
};

const PortMenu = ({ node, onSelectPort }: PortMenuProps) => {
    const { devices } = useScenario()

    const portAlreadyConnected = useCallback((port: string) => {
        //return devices.get(node.id)?.portsConnected.find(portObj => portObj.port == port)
        return Array.from(devices.get(node.id)?.portsConnected.values()!).find(portObj => portObj.port == port)
    }, [])

    return (
        <div
            className="bg-gray-800 shadow-xl rounded-md border border-gray-700"
        >
            <div className="p-2 border-b border-gray-600 flex justify-between items-center">
                <p className="text-sm font-bold text-gray-300 select-none   ">Portas de {node.data.label}</p>
            </div>
            <ul className="p-1 max-h-48 overflow-y-auto 
                scrollbar-thumb-rounded-full scrollbar-track-rounded-full scrollbar scrollbar-thumb-slate-500 scrollbar-track-transparent
            ">
                {node.data.ports.map((port) => (
                    <li
                        key={port}
                        onClick={() => {
                            if (!portAlreadyConnected(port)) onSelectPort(node.id, port)
                        }}
                        className={`
                            text-zinc-400 text-sm p-2 rounded-md hover:bg-blue-500 hover:text-white  transition-colors duration-150 select-none
                            ${portAlreadyConnected(port)
                                ? 'cursor-not-allowed text-zinc-700 hover:bg-transparent hover:text-zinc-700'
                                : 'cursor-pointer'
                            }    
                        `}
                    >
                        {port}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default PortMenu;