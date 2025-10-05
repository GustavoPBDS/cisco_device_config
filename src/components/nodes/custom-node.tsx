import React from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import RouterSvgComponent from '../icons/devices/router';
import SwitchSvgComponent from '../icons/devices/switch';
import PCSvgComponent from '../icons/devices/pc';
import { NetworkDeviceData } from '@/interfaces/devices';

const CustomNode = ({ data }: NodeProps<NetworkDeviceData>) => {
    return (
        <div className="relative cursor-pointer flex flex-col items-center gap-0">
            {data.type === 'router' && <RouterSvgComponent />}
            {data.type === 'switch' && <SwitchSvgComponent />}
            {data.type === 'pc' && <PCSvgComponent />}

            <p
                className='font-sans text-sm text-zinc-300'
            >
                {data.label}
            </p>

            <Handle
                type="source"
                position={Position.Top}
                id="center-source"
                style={{
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    opacity: 0,
                    pointerEvents: 'none',
                }}
            />
            <Handle
                type="target"
                position={Position.Top}
                id="center-target"
                style={{
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    opacity: 0,
                    pointerEvents: 'none',
                }}
            />
        </div>
    );
};

export default React.memo(CustomNode)