import { defaultIps, subnetMasks } from "@/utils/default-ips";
import { Dispatch, SetStateAction } from "react";
import { IVlan } from "../switch-form";

interface IProps {
    managerIp: string;
    setManagerIp: Dispatch<SetStateAction<string>>;
    subnetMask: string;
    setSubnetMask: Dispatch<SetStateAction<string>>;
    defaultGateway: string;
    setDefaultGateway: Dispatch<SetStateAction<string>>;
    managementVlanId: string;
    setManagementVlanId: Dispatch<SetStateAction<string>>;
    vlans: IVlan[];
    errors: Record<string, string>;
}

export default function ManagementConfig({
    managerIp, setManagerIp, subnetMask, setSubnetMask, defaultGateway, setDefaultGateway,
    managementVlanId, setManagementVlanId, vlans, errors
}: IProps) {
    return (
        <>
            <div className="flex gap-2 my-2">
                {defaultIps.map(ipTemplate => (
                    <button
                        key={ipTemplate}
                        type="button"
                        onClick={() => setManagerIp(ipTemplate)}
                        className="bg-zinc-700 hover:bg-zinc-600 text-xs text-zinc-300 px-2 py-1 rounded-md transition-colors cursor-pointer"
                    >
                        {ipTemplate}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {/* IP de Gerenciamento */}
                <div className="flex flex-col gap-1">
                    <label className="text-sm text-zinc-300" htmlFor="managerIp">IP do Switch</label>
                    <input
                        className="bg-gray-900 rounded-lg p-2 text-sm focus:outline-none"
                        type="text" placeholder="Ex: 192.168.1.2" id="managerIp"
                        value={managerIp} onChange={e => setManagerIp(e.target.value)}
                    />
                    {errors.managerIp && <p className="text-red-400 text-sm">{errors.managerIp}</p>}
                </div>

                {/* Máscara de Sub-rede */}
                <div className="flex flex-col gap-1">
                    <label className="text-sm text-zinc-300" htmlFor="subnetMask">Máscara de Sub-rede</label>
                    <select
                        id="subnetMask"
                        value={subnetMask}
                        onChange={e => setSubnetMask(e.target.value)}
                        className="bg-gray-900 rounded-lg p-2 text-sm focus:outline-none"
                    >
                        {Array.from(subnetMasks.entries()).map(([cidr, mask]) => (
                            <option key={cidr} value={mask}>{cidr} ({mask})</option>
                        ))}
                    </select>
                </div>

                {/* VLAN de Gerenciamento */}
                <div className="flex flex-col gap-1">
                    <label className="text-sm text-zinc-300" htmlFor="managementVlan">VLAN de Gerenciamento</label>
                    <select
                        id="managementVlan"
                        value={managementVlanId}
                        onChange={e => setManagementVlanId(e.target.value)}
                        className="bg-gray-900 rounded-lg p-2 text-sm focus:outline-none disabled:cursor-not-allowed disabled:text-zinc-500"
                        disabled={vlans.length === 0}
                    >
                        <option value="">
                            {vlans.length > 0 ? 'Selecione uma VLAN' : 'Crie uma VLAN primeiro'}
                        </option>
                        {vlans.map(vlan => (
                            <option key={vlan.id} value={vlan.id}>
                                {vlan.id} - {vlan.name}
                            </option>
                        ))}
                    </select>
                    {errors.managementVlan && <p className="text-red-400 text-sm">{errors.managementVlan}</p>}
                </div>


                {/* Gateway Padrão */}
                <div className="flex flex-col gap-1">
                    <label className="text-sm text-zinc-300" htmlFor="defaultGateway">Gateway Padrão</label>
                    <input
                        className="bg-gray-900 rounded-lg p-2 text-sm focus:outline-none"
                        type="text" placeholder="Ex: 192.168.1.1" id="defaultGateway"
                        value={defaultGateway} onChange={e => setDefaultGateway(e.target.value)}
                    />
                    {errors.defaultGateway && <p className="text-red-400 text-sm">{errors.defaultGateway}</p>}
                </div>
            </div>
        </>
    );
}