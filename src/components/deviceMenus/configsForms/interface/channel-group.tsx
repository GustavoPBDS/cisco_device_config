import { Plus, X } from "lucide-react";
import { IChannelGroup, IInterfaceConfig, IVlan } from "../switch-form";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { NetworkDeviceData } from "@/interfaces/devices";
import ConfigContainer from "./configContainer";

interface IProps {
    channelGroups: IChannelGroup[],
    setChannelGroups: Dispatch<SetStateAction<IChannelGroup[]>>
    device: NetworkDeviceData,
    errors: Record<string, string>,
    vlans: IVlan[],
    interfaceConfigs: Record<string, IInterfaceConfig>,
    setInterfaceConfigs: Dispatch<SetStateAction<Record<string, IInterfaceConfig>>>
}

export default function ChannelGroup({ channelGroups, setChannelGroups, device, errors, vlans, setInterfaceConfigs }: IProps) {
    const [editingGroup, setEditingGroup] = useState<IChannelGroup | null>(null);

    const usedPortsInChannelGroups = useMemo(() => {
        return new Set(channelGroups.flatMap(group => group.interfaces));
    }, [channelGroups]);

    const addChannelGroup = () => {
        const existingIds = channelGroups.map(cg => parseInt(cg.id, 10)).filter(id => !isNaN(id));
        const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
        const newId = (maxId + 1).toString();

        setChannelGroups(prevState => [
            ...prevState,
            { internalId: crypto.randomUUID(), id: newId, interfaces: [] }
        ]);
    };

    const removeChannelGroup = (internalId: string) => {
        setChannelGroups(prevState => prevState.filter(group => group.internalId !== internalId));
    };

    const updateChannelGroupId = (internalId: string, newId: string) => {
        setChannelGroups(prevState =>
            prevState.map(group => (group.internalId === internalId ? { ...group, id: newId } : group))
        );
    };

    const addInterfaceInChannelGroup = (internalId: string, port: string) => {
        if (!port) return;

        setChannelGroups(prevState =>
            prevState.map(group => {
                if (group.internalId === internalId && !group.interfaces.includes(port)) {
                    return { ...group, interfaces: [...group.interfaces, port] };
                }
                return group;
            })
        );
    };

    const removeInterfaceInChannelGroup = (internalId: string, port: string) => {
        setChannelGroups(prevState =>
            prevState.map(group => {
                if (group.internalId === internalId) {
                    return { ...group, interfaces: group.interfaces.filter(p => p !== port) };
                }
                return group;
            })
        );
    };


    const handleGroupConfigApply = (newConfig: IInterfaceConfig) => {
        if (!editingGroup) return;

        setChannelGroups(prevGroups =>
            prevGroups.map(g =>
                g.internalId === editingGroup.internalId
                    ? { ...g, config: newConfig }
                    : g
            )
        );

        setInterfaceConfigs(prevInterfaces => {
            const updatedInterfaces = { ...prevInterfaces };
            for (const port of editingGroup.interfaces) {
                updatedInterfaces[port] = newConfig;
            }
            return updatedInterfaces;
        });

        setEditingGroup(null)
    };

    return (
        <>
            {channelGroups.map((group) => (
                <div key={group.internalId} className="flex flex-col gap-3 p-3 border border-zinc-700 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1 w-1/2">
                            <label htmlFor={group.internalId} className="text-sm text-zinc-300">Group ID</label>
                            <input
                                type="text" id={group.internalId} placeholder="Ex: 1"
                                className="bg-gray-900 rounded-lg p-2 text-sm focus:outline-none"
                                value={group.id}
                                onChange={(e) => updateChannelGroupId(group.internalId, e.target.value)}
                            />
                        </div>
                        <button
                            className="w-fit h-fit rounded-md bg-red-500 p-1.5 text-sm cursor-pointer"
                            type="button" onClick={() => removeChannelGroup(group.internalId)}
                        >Excluir</button>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-zinc-300">Portas do Grupo</label>
                        <div className="flex flex-wrap gap-2 my-2 min-h-[28px]">
                            {group.interfaces.map((port, i) => (
                                <div key={i} className="text-xs p-1.5 rounded-md border border-sky-400 text-zinc-400 bg-zinc-800 flex items-center gap-2 select-none">
                                    {port}
                                    <X className="text-red-500 h-4 w-4 cursor-pointer"
                                        onClick={() => removeInterfaceInChannelGroup(group.internalId, port)}
                                    />
                                </div>
                            ))}
                        </div>
                        <select
                            value={''}
                            className="p-2 bg-gray-900 border border-zinc-700 rounded-md text-sm focus:outline-none"
                            onChange={e => addInterfaceInChannelGroup(group.internalId, e.target.value)}
                        >
                            <option value="" disabled>Selecione as Portas...</option>
                            {device.ports
                                .filter(port => !usedPortsInChannelGroups.has(port))
                                .map((port, i) => (
                                    <option key={i} value={port}>{port}</option>
                                ))
                            }
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={() => setEditingGroup(group)}
                        className="w-full rounded-md bg-sky-500 p-1 text-sm cursor-pointer"
                    >
                        Abrir Configurações do Grupo
                    </button>
                </div>
            ))}
            {errors.channelGroups && <p className="text-red-400 text-sm">{errors.channelGroups}</p>}
            <button
                type="button"
                className="p-1 w-fit bg-emerald-500 rounded-sm cursor-pointer text-sm hover:opacity-90 flex items-center gap-2"
                onClick={addChannelGroup}
            >
                <Plus />
                Adicionar Channel Group
            </button>

            {editingGroup && (
                <ConfigContainer
                    onClose={() => setEditingGroup(null)}
                    title={`Configuração do Channel Group ${editingGroup.id}`}
                    vlans={vlans}
                    initialConfig={editingGroup.config ?? {}}
                    onApply={handleGroupConfigApply}
                />
            )}
        </>
    )
}