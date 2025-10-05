import { useMemo, useState } from "react";
import { IVlan } from "../switch-form";
import { X } from "lucide-react";

interface ISpanningTreeConfigProps {
    allVlans: IVlan[];
    primaryVlans: string[];
    setPrimaryVlans: React.Dispatch<React.SetStateAction<string[]>>;
    secondaryVlans: string[];
    setSecondaryVlans: React.Dispatch<React.SetStateAction<string[]>>;
}

const VlanTag = ({ vlan, onAction, type }: { vlan: IVlan; onAction: () => void; type: 'available' | 'assigned' }) => {
    if (type === 'available') {
        return (
            <div onClick={onAction} className="flex-shrink-0 flex items-center bg-zinc-600 text-zinc-200 py-1 px-2 rounded-md cursor-pointer transition-colors hover:bg-zinc-500 text-sm">
                {vlan.id} - {vlan.name}
            </div>
        );
    }
    return (
        <div className="flex-shrink-0 flex items-center bg-sky-600 text-white py-1 px-2 rounded-md text-sm">
            <span>{vlan.id} - {vlan.name}</span>
            <button type="button" onClick={onAction} className="ml-2 cursor-pointer font-bold text-sky-200 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
    );
};

export default function SpanningTreeConfig({ allVlans, primaryVlans, setPrimaryVlans, secondaryVlans, setSecondaryVlans }: ISpanningTreeConfigProps) {
    const [lastFocused, setLastFocused] = useState<'primary' | 'secondary'>('primary');

    const availableVlans = useMemo(() => {
        const assignedIds = new Set([...primaryVlans, ...secondaryVlans]);
        return allVlans.filter(vlan => vlan.id && !assignedIds.has(vlan.id));
    }, [allVlans, primaryVlans, secondaryVlans]);

    const handleAssignVlan = (vlanId: string) => {
        if (lastFocused === 'primary') {
            if (!primaryVlans.includes(vlanId)) {
                setPrimaryVlans(prev => [...prev, vlanId].sort((a, b) => Number(a) - Number(b)));
            }
        } else {
            if (!secondaryVlans.includes(vlanId)) {
                setSecondaryVlans(prev => [...prev, vlanId].sort((a, b) => Number(a) - Number(b)));
            }
        }
    };

    const handleRemoveVlan = (vlanId: string, type: 'primary' | 'secondary') => {
        if (type === 'primary') {
            setPrimaryVlans(prev => prev.filter(id => id !== vlanId));
        } else {
            setSecondaryVlans(prev => prev.filter(id => id !== vlanId));
        }
    };

    const primaryContainerClasses = `flex flex-wrap items-center gap-2 bg-gray-900 rounded-lg p-1.5 min-h-[44px] cursor-text border transition-all duration-200 ${lastFocused === 'primary' ? 'border-sky-500 shadow-lg shadow-sky-500/10' : 'border-zinc-700'}`;
    const secondaryContainerClasses = `flex flex-wrap items-center gap-2 bg-gray-900 rounded-lg p-1.5 min-h-[44px] cursor-text border transition-all duration-200 ${lastFocused === 'secondary' ? 'border-green-500 shadow-lg shadow-green-500/10' : 'border-zinc-700'}`;

    return (
        <div className="flex flex-col gap-4 w-full">

            <div>
                <label className="text-sm font-semibold text-zinc-300">VLANs Disponíveis</label>
                <p
                    className="text-xs text-zinc-400"
                >Selecione o campo de prioridade para atribuir as vlans</p>
                <div className="mt-1 p-1.5 bg-gray-900/50 rounded-lg border border-zinc-700 flex flex-wrap gap-2 min-h-[44px]">
                    {availableVlans.length > 0 ? availableVlans.map(vlan => (
                        <VlanTag key={vlan.id} vlan={vlan} onAction={() => handleAssignVlan(vlan.id)} type="available" />
                    )) : <p className="text-xs text-zinc-500 px-1">Nenhuma VLAN disponível para atribuição.</p>}
                </div>
            </div>

            <div>
                <label className="text-xs font-semibold text-sky-300">Root Primário (Prioridade 0)</label>
                <div
                    tabIndex={0}
                    className={primaryContainerClasses}
                    onFocus={() => setLastFocused('primary')}
                    onClick={() => setLastFocused('primary')}
                >
                    {primaryVlans.map(vlanId => {
                        const vlan = allVlans.find(v => v.id === vlanId);
                        return vlan ? <VlanTag key={vlanId} vlan={vlan} onAction={() => handleRemoveVlan(vlanId, 'primary')} type="assigned" /> : null;
                    })}
                </div>
            </div>

            <div>
                <label className="text-xs font-semibold text-green-300">Root Secundário (Prioridade 4096)</label>
                <div
                    tabIndex={0}
                    className={secondaryContainerClasses}
                    onFocus={() => setLastFocused('secondary')}
                    onClick={() => setLastFocused('secondary')}
                >
                    {secondaryVlans.map(vlanId => {
                        const vlan = allVlans.find(v => v.id === vlanId);
                        return vlan ? <VlanTag key={vlanId} vlan={vlan} onAction={() => handleRemoveVlan(vlanId, 'secondary')} type="assigned" /> : null;
                    })}
                </div>
            </div>
        </div>
    );
}

