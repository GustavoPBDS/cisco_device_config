'use client'

import PCSvgComponent from "./icons/devices/pc";
import RouterSvgComponent from "./icons/devices/router";
import SwitchSvgComponent from "./icons/devices/switch";

type SidebarProps = {
    onDragStart: (event: React.DragEvent, nodeType: string) => void;
    onTouchStart: (event: React.TouchEvent, nodeType: string) => void;
};

export default function Sidebar({ onDragStart, onTouchStart }: SidebarProps) {

    return (
        <aside className="border-r-2 border-gray-600 p-4 text-sm bg-gray-800 w-full">
            <h2 className="text-lg font-bold mb-2 text-gray-200">Dispositivos</h2>

            <div className="flex flex-wrap gap-2">
                <div
                    className="group w-39 p-1 bg-zinc-400 border-2 border-dashed rounded-md  cursor-grab flex flex-col items-center justify-center transition-colors hover:bg-blue-50 hover:border-blue-400"
                    onDragStart={(event) => onDragStart(event, 'router')}
                    onTouchStart={(event) => onTouchStart(event, 'router')}
                    draggable
                >
                    <RouterSvgComponent />
                    <span className='font-bold text-zinc-100 group-hover:text-sky-400 text-center text-sm'>Router</span>
                </div>

                <div
                    className="group w-39 p-1 bg-zinc-400 border-2 border-dashed rounded-md  cursor-grab flex flex-col items-center justify-center transition-colors hover:bg-blue-50 hover:border-blue-400"
                    onDragStart={(event) => onDragStart(event, 'switch')}
                    onTouchStart={(event) => onTouchStart(event, 'switch')}
                    draggable
                >
                    <SwitchSvgComponent />
                    <span className='font-bold text-zinc-100 group-hover:text-sky-400 text-center text-sm'>Switch</span>
                </div>

                <div
                    className="group w-39 p-1 bg-zinc-400 border-2 border-dashed rounded-md  cursor-grab flex flex-col items-center justify-center transition-colors hover:bg-blue-50 hover:border-blue-400"
                    onDragStart={(event) => onDragStart(event, 'pc')}
                    onTouchStart={(event) => onTouchStart(event, 'pc')}
                    draggable
                >
                    <PCSvgComponent />
                    <span className='font-bold text-zinc-100 group-hover:text-sky-400 text-center text-sm'>PC</span>
                </div>
            </div>
        </aside>
    );
};