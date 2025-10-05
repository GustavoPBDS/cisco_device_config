import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";

interface IProps {
    autoExclusions: string[];
    manualExclusions: string[];
    onAddManualExclusion: (ip: string) => void;
    onRemoveManualExclusion: (ip: string) => void;
}

export default function DhcpExclusionConfig({
    autoExclusions,
    manualExclusions,
    onAddManualExclusion,
    onRemoveManualExclusion
}: IProps) {
    const [newIp, setNewIp] = useState("");
    const [error, setError] = useState("");

    const allExclusionsSet = useMemo(() => {
        return new Set([...autoExclusions, ...manualExclusions]);
    }, [autoExclusions, manualExclusions]);

    const validateIp = (ip: string) => {
        const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (!ipRegex.test(ip)) {
            setError("Endereço IP inválido.");
            return false;
        }
        if (allExclusionsSet.has(ip)) {
            setError("Este IP já está na lista de exclusão.");
            return false;
        }
        setError("");
        return true;
    };

    const handleAddIp = () => {
        if (validateIp(newIp)) {
            onAddManualExclusion(newIp);
            setNewIp("");
        }
    };


    return (
        <div className="flex flex-col gap-4 w-full">
            <div>
                <h6 className="text-sm font-semibold text-zinc-300">Exclusões Automáticas</h6>
                <p className="text-xs text-zinc-400 mb-2">Gateways e Broadcasts das sub-interfaces.</p>
                <div className="bg-gray-900/50 p-2 rounded-md min-h-[50px] max-h-28 overflow-y-auto">
                    {autoExclusions.length > 0 ? (
                        <ul className="flex flex-wrap gap-2">
                            {autoExclusions.map(ip => (
                                <li key={ip} className="text-sm font-mono bg-zinc-700 text-zinc-200 px-2 py-0.5 rounded-md">
                                    {ip}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-zinc-500">Nenhuma sub-interface configurada.</p>
                    )}
                </div>
            </div>

            <div>
                <h6 className="text-sm font-semibold text-zinc-300">Exclusões Manuais</h6>
                <p className="text-xs text-zinc-400 mb-2">Adicione IPs para servidores, impressoras, etc.</p>
                <div className="flex items-center gap-2 mb-2">
                    <input
                        type="text"
                        value={newIp}
                        onChange={(e) => setNewIp(e.target.value)}
                        placeholder="Ex: 172.16.10.100"
                        className="bg-gray-800 border border-zinc-700 flex-grow rounded-lg p-2 text-sm focus:outline-none"
                    />
                    <button type="button" onClick={handleAddIp} className="p-2 bg-sky-600 rounded-md hover:bg-sky-700 cursor-pointer">
                        <Plus size={20} />
                    </button>
                </div>
                {error && <p className="text-red-400 text-sm mb-2">{error}</p>}

                <div className="bg-gray-900/50 p-2 rounded-md min-h-[50px] max-h-28 overflow-y-auto">
                    {manualExclusions.length > 0 && (
                        <ul className="flex flex-wrap gap-2">
                            {manualExclusions.map(ip => (
                                <li key={ip} className="flex items-center gap-2 text-sm font-mono bg-zinc-600 text-zinc-100 px-2 py-0.5 rounded-md">
                                    {ip}

                                    <X size={14} className="cursor-pointer hover:text-red-400" onClick={() => onRemoveManualExclusion(ip)} />
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}