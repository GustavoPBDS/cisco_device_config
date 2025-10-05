import { IInterfaceConfig, IVlan } from "../switch-form";

interface IProps {
    vlans: IVlan[];
    config: IInterfaceConfig;
    onConfigChange: (newConfig: Partial<IInterfaceConfig>) => void;
}

export default function AccessForm({ vlans, config, onConfigChange }: IProps) {
    return (
        <div className="mb-2 flex flex-col gap-4">
            <div className="flex flex-col gap-0.5">
                <label htmlFor="accessvlan">Vlan de acesso</label>
                <select
                    className="p-0.5 border border-zinc-700 rounded-md text-sm focus:outline-none"
                    id="accessvlan"
                    value={config.accessVlan ?? ''}
                    onChange={(e) => onConfigChange({ accessVlan: e.target.value })}
                >
                    <option className="bg-zinc-600" value="" disabled>
                        Selecione uma Vlan...
                    </option>
                    {vlans.map((vlan, i) => (
                        <option className="bg-zinc-600" key={i} value={vlan.id}>
                            {vlan.id} - {vlan.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex flex-col gap-2">
                <p className="font-light text-zinc-300">Spanning Tree Protocol (STP)</p>
                <div className="flex items-center justify-between">
                    <div className="flex items-center justify-center gap-2">
                        <input
                            type="checkbox"
                            id="bpduguard"
                            className="cursor-pointer"
                            checked={config.bpduGuard ?? false}
                            onChange={() => onConfigChange({ bpduGuard: !config.bpduGuard })}
                        />
                        <label className="text-sm cursor-pointer" htmlFor="bpduguard">
                            Ativar BPDU Guard
                        </label>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        <input
                            type="checkbox"
                            id="portfast"
                            className="cursor-pointer"
                            checked={config.portfast ?? false}
                            onChange={() => onConfigChange({ portfast: !config.portfast })}
                        />
                        <label className="text-sm cursor-pointer" htmlFor="portfast">
                            Ativar Portfast
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}