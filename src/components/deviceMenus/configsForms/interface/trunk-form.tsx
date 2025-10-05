import { IInterfaceConfig, IVlan } from "../switch-form";

interface IProps {
    vlans: IVlan[];
    config: IInterfaceConfig;
    onConfigChange: (newConfig: Partial<IInterfaceConfig>) => void;
}

export default function TrunkForm({ vlans, config, onConfigChange }: IProps) {
    const handleClickVlan = (vlanId: string) => {
        const isSelected = config.trunkVlans?.includes(vlanId);
        let newTrunkVlans: string[];

        if (isSelected) {
            newTrunkVlans = (config.trunkVlans ?? []).filter((id) => id !== vlanId);
        } else {
            newTrunkVlans = [...config.trunkVlans ?? [], vlanId];
        }
        onConfigChange({ trunkVlans: newTrunkVlans });
    };

    const isVlanSelected = (vlanId: string) => {
        return config.trunkVlans?.some((id) => id === vlanId);
    };

    return (
        <div className="mb-2 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
                <p>Selecione as Vlans permitidas no trunk</p>
                <div className="flex flex-wrap gap-3">
                    {vlans.map((vlan, i) => (
                        <p
                            key={i}
                            onClick={() => handleClickVlan(vlan.id)}
                            className={`p-2 w-fit text-sm cursor-pointer select-none rounded-md ${isVlanSelected(vlan.id)
                                ? "bg-sky-500"
                                : "bg-zinc-700 text-zinc-400"
                                }`}
                        >
                            {vlan.id} - {vlan.name}
                        </p>
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-0.5">
                <label htmlFor="nativevlan">Vlan Nativa</label>
                <select
                    className="p-0.5 border border-zinc-700 rounded-md text-sm focus:outline-none"
                    id="nativevlan"
                    value={config.nativeVlan ?? ''}
                    onChange={(e) => onConfigChange({ nativeVlan: e.target.value })}
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
        </div>
    );
}