import TabItem from "@/components/TabItem";
import { IRouterSubInterfaceConfig } from "../../router-form";
import { Tabs } from "radix-ui";
import { useState } from "react";
import { getNetworkInfo } from "@/utils/calcs-ips";
import { cidrMasks, defaultIps, subnetMasks } from "@/utils/default-ips";

interface IProps {
    vlansOnPort: string[];
    allSortedVlans: string[];
    subInterfaceConfigs: Record<string, IRouterSubInterfaceConfig>;
    onConfigChange: (vlanId: string, field: keyof IRouterSubInterfaceConfig, value: string) => void;
    errors?: Record<string, string>;
}

export default function RouteInStickConfig({ vlansOnPort, allSortedVlans, subInterfaceConfigs, onConfigChange, errors = {} }: IProps) {
    const [selectedVlan, setSelectedVlan] = useState(vlansOnPort[0]);
    const [ipTemplate, setIpTemplate] = useState(() => {
        const firstIp = subInterfaceConfigs[allSortedVlans[0]]?.ip;
        return defaultIps.find(t => t.startsWith(firstIp?.split('.').slice(0, 2).join('.') || '')) || 'Custom';
    });

    const handleLocalChange = (vlanId: string, field: keyof IRouterSubInterfaceConfig, value: string) => {
        onConfigChange(vlanId, field, value);
    };

    const handleTemplateChange = (template: string) => {
        setIpTemplate(template);
        if (template !== 'Custom') {
            handleLocalChange(allSortedVlans[0], 'ip', template);
        }
    };

    return (
        <Tabs.Root value={selectedVlan} onValueChange={setSelectedVlan}>
            <Tabs.List
                className={`grid grid-rows-1 border-b-2 border-zinc-600`}
                style={{ gridTemplateColumns: `repeat(${vlansOnPort.length}, minmax(0, 1fr))` }}
            >
                {vlansOnPort.map((vlan) => (
                    <TabItem key={vlan} isSelected={selectedVlan === vlan} title={`VLAN ${vlan}`} value={vlan} />
                ))}
            </Tabs.List>

            {vlansOnPort.map((vlanId) => {
                const config = subInterfaceConfigs[vlanId] || {};
                const networkInfo = getNetworkInfo(config.ip ?? '', config.subnetMask ?? '');
                const isAbsoluteFirst = vlanId === allSortedVlans[0];
                const currentCidr = cidrMasks.get(config.subnetMask || '') || '';
                const hasError = !!errors[vlanId];

                return (
                    <Tabs.Content key={vlanId} value={vlanId} className="p-2 flex flex-col gap-3 focus:outline-none">
                        {isAbsoluteFirst && (
                            <div className="flex flex-wrap gap-1">
                                {defaultIps.map(ipTemplateValue => (
                                    <button
                                        key={ipTemplateValue} type="button"
                                        onClick={() => handleTemplateChange(ipTemplateValue)}
                                        data-active={ipTemplate === ipTemplateValue}
                                        className="bg-zinc-700 data-[active=true]:bg-sky-600 hover:bg-zinc-600 text-xs text-zinc-200 px-2 py-1 rounded-md transition-colors cursor-pointer w-fit"
                                    >{ipTemplateValue}</button>
                                ))}
                            </div>
                        )}
                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-zinc-300" htmlFor={`ip-${vlanId}`}>Gateway IP</label>
                            <input
                                className={`bg-gray-800 rounded-lg p-2 text-sm focus:outline-none ${!isAbsoluteFirst ? 'opacity-70 cursor-not-allowed border-dashed border-2 border-zinc-600' : ''} ${hasError ? 'border-2 border-red-500' : ''}`}
                                type="text" placeholder="Ex: 192.168.10.1" id={`ip-${vlanId}`}
                                value={config.ip ?? ''}
                                readOnly={!isAbsoluteFirst}
                                onChange={e => handleLocalChange(vlanId, 'ip', e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-zinc-300" htmlFor={`mask-${vlanId}`}>Máscara de Sub-rede</label>
                            <select
                                className={`bg-gray-800 rounded-lg p-2 text-sm focus:outline-none ${hasError ? 'border-2 border-red-500' : ''}`}
                                id={`mask-${vlanId}`} value={currentCidr}
                                onChange={e => handleLocalChange(vlanId, 'subnetMask', subnetMasks.get(e.target.value) || '')}
                            >
                                <option value="" disabled>Selecione uma máscara</option>
                                {Array.from(subnetMasks.keys()).map(cidr => (
                                    <option key={cidr} value={cidr}>{`${cidr} (${subnetMasks.get(cidr)})`}</option>
                                ))}
                            </select>
                        </div>
                        {networkInfo && <div className="text-xs text-zinc-400 mt-2 text-right"><p>Rede: <span className="font-mono text-cyan-400">{networkInfo.networkAddress}</span></p><p>Hosts: <span className="font-mono text-green-400">{networkInfo.usableHosts.toLocaleString('pt-BR')}</span></p></div>}
                        {hasError && <p className="text-red-400 text-sm mt-1">{errors[vlanId]}</p>}
                    </Tabs.Content>
                );
            })}
        </Tabs.Root>
    );
}

