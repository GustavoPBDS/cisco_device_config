'use client'

import { NetworkDeviceData } from "@/interfaces/devices"
import { getNetworkInfo, ipToLong, longToIp } from "@/utils/calcs-ips"
import { exportPcConfig, exportRouterConfig, exportSwitchConfig } from "@/utils/exportsFunctions"
import { createContext, ReactNode, useContext, useState } from "react"

const devicesPorts = {
    switch: [
        'GigabitEthernet 0/1', 'GigabitEthernet 0/2',
        'FastEthernet 0/1', 'FastEthernet 0/2', 'FastEthernet 0/3',
        'FastEthernet 0/4', 'FastEthernet 0/5', 'FastEthernet 0/6',
        'FastEthernet 0/7', 'FastEthernet 0/8', 'FastEthernet 0/9',
        'FastEthernet 0/10', 'FastEthernet 0/11', 'FastEthernet 0/12',
        'FastEthernet 0/13', 'FastEthernet 0/14', 'FastEthernet 0/15',
        'FastEthernet 0/16', 'FastEthernet 0/17', 'FastEthernet 0/18',
        'FastEthernet 0/19', 'FastEthernet 0/20', 'FastEthernet 0/21',
        'FastEthernet 0/22', 'FastEthernet 0/23', 'FastEthernet 0/24',
    ],
    router: [
        'GigabitEthernet 0/0', 'GigabitEthernet 0/1', 'GigabitEthernet 0/2',
        'GigabitEthernet 0/3', 'GigabitEthernet 0/4', 'GigabitEthernet 0/5',
        'Serial 0/0'
    ],
    pc: ['FastEthernet 0/1']
}

const initialDevices = new Map<string, NetworkDeviceData>([
    ['1', {
        type: 'router',
        label: 'Roteador-1',
        ports: devicesPorts.router,
        portsConnected: new Map()
    }],
    ['2', {
        type: 'switch',
        label: 'Switch-1',
        ports: devicesPorts.switch,
        portsConnected: new Map()
    }],
    ['3', {
        type: 'switch',
        label: 'Switch-2',
        ports: devicesPorts.switch,
        portsConnected: new Map()
    }],
    ['4', {
        type: 'pc',
        label: 'PC-1',
        ports: devicesPorts.pc,
        portsConnected: new Map()
    }],
    ['5', {
        type: 'pc',
        label: 'PC-2',
        ports: devicesPorts.pc,
        portsConnected: new Map()
    }],
])

interface IScenarioContext {
    devices: Map<string, NetworkDeviceData>,
    addPc: () => [NetworkDeviceData, string],
    addRouter: () => [NetworkDeviceData, string],
    addSwitch: () => [NetworkDeviceData, string],
    removeDevice: (id: string) => void
    connectDevices: (edgeId: string, device: { id: string, port: string }, sourceDevice: { id: string, port: string }) => void
    disconnectDevices: (edgeId: string) => void

    updateDeviceConfig: (id: string, config: Partial<NetworkDeviceData["config"]>) => void
    exportConfig: (deviceId: string) => string

    requestDhcpLease: (pcId: string, router: NetworkDeviceData, vlanId: string) => { assignedIp: string, subnetMask: string } | null;
    releaseDhcpLease: (pcId: string) => void;
}
const ScenarioContext = createContext({} as IScenarioContext)

export function ScenarioContextProvider({ children }: { children: ReactNode }) {
    const [devices, setDevices] = useState<Map<string, NetworkDeviceData>>(initialDevices)

    const [dhcpLeases, setDhcpLeases] = useState<Map<string, Map<string, string>>>(new Map());

    const getUniqueLabel = (type: string, devicesMap: Map<string, NetworkDeviceData>) => {
        const existingLabels = Array.from(devicesMap.values())
            .filter(d => d.type === (type.toLowerCase()))
            .map(d => d.label)

        let counter = 1
        let newLabel = `${capitalize(type)}-${counter}`

        while (existingLabels.includes(newLabel)) {
            counter++
            newLabel = `${capitalize(type)}-${counter}`
        }

        return newLabel
    }

    const addPc = (): [NetworkDeviceData, string] => {
        const newId = crypto.randomUUID()

        let newPc: NetworkDeviceData

        setDevices(prev => {
            const label = getUniqueLabel('PC', prev)
            newPc = {
                type: 'pc',
                ports: devicesPorts.pc,
                portsConnected: new Map(),
                label,
            }
            const updated = new Map(prev)
            updated.set(newId, newPc)
            return updated
        })

        return [newPc!, newId]
    }

    const addRouter = (): [NetworkDeviceData, string] => {
        const newId = crypto.randomUUID()

        let newRouter: NetworkDeviceData

        setDevices(prev => {
            const label = getUniqueLabel('Roteador', prev)
            newRouter = {
                type: 'router',
                ports: devicesPorts.router,
                portsConnected: new Map(),
                label,
            }
            const updated = new Map(prev)
            updated.set(newId, newRouter)
            return updated
        })

        return [newRouter!, newId]
    }

    const addSwitch = (): [NetworkDeviceData, string] => {
        const newId = crypto.randomUUID()

        let newSwitch: NetworkDeviceData

        setDevices(prev => {
            const label = getUniqueLabel('Switch', prev)
            newSwitch = {
                type: 'switch',
                ports: devicesPorts.switch,
                portsConnected: new Map(),
                label,
            }
            const updated = new Map(prev)
            updated.set(newId, newSwitch)
            return updated
        })

        return [newSwitch!, newId]
    }

    const releaseDhcpLease = (pcId: string) => {
        setDhcpLeases(prevLeases => {
            const newLeases = new Map(prevLeases);
            let leaseUpdated = false;

            for (const [poolId, leaseMap] of newLeases.entries()) {
                for (const [ip, leasedPcId] of leaseMap.entries()) {
                    if (leasedPcId === pcId) {
                        const newLeaseMap = new Map(leaseMap);
                        newLeaseMap.delete(ip);
                        newLeases.set(poolId, newLeaseMap);
                        leaseUpdated = true;
                        break;
                    }
                }
                if (leaseUpdated) break;
            }

            return leaseUpdated ? newLeases : prevLeases;
        });
    };

    const requestDhcpLease = (pcId: string, router: NetworkDeviceData, vlanId: string): { assignedIp: string, subnetMask: string } | null => {
        const subInterface = Object.values(router.config?.interfaces || {})
            .flatMap(iface => Object.entries(iface.subInterfaces || {}))
            .find(([subIfaceVlan]) => subIfaceVlan === vlanId)?.[1];

        if (!subInterface || !subInterface.ip || !subInterface.subnetMask) {
            return null;
        }

        const { ip: gatewayIp, subnetMask } = subInterface;
        const poolId = `${router.label}-${vlanId}`;

        const currentPoolLeases = dhcpLeases.get(poolId);
        if (currentPoolLeases) {
            for (const [ip, leasedPcId] of currentPoolLeases.entries()) {
                if (leasedPcId === pcId) {
                    return { assignedIp: ip, subnetMask: subnetMask };
                }
            }
        }
        releaseDhcpLease(pcId);

        const networkInfo = getNetworkInfo(gatewayIp, subnetMask);
        if (!networkInfo) return null;

        const networkLong = ipToLong(networkInfo.networkAddress);
        const broadcastLong = ipToLong(networkInfo.broadcastAddress);

        const excludedIps = new Set(router.config?.dhcpExcluded || []);
        let assignedIp: string | null = null;

        setDhcpLeases(prevLeases => {
            const newTotalLeases = new Map(prevLeases);
            const poolLeases = newTotalLeases.get(poolId) || new Map();
            const leasedIps = new Set(poolLeases.keys());

            for (let i = networkLong + 1; i < broadcastLong; i++) {
                const currentIp = longToIp(i);

                if (!excludedIps.has(currentIp) && !leasedIps.has(currentIp)) {
                    assignedIp = currentIp;
                    const newPoolLeases = new Map(poolLeases);
                    newPoolLeases.set(assignedIp, pcId);
                    newTotalLeases.set(poolId, newPoolLeases);
                    break;
                }
            }
            return newTotalLeases;
        });

        if (assignedIp) {
            return { assignedIp, subnetMask };
        }

        return null;
    };


    const removeDevice = (id: string) => {
        const deviceToRemove = devices.get(id);
        if (deviceToRemove?.type === 'pc') {
            releaseDhcpLease(id);
        }

        setDevices((prev: Map<string, NetworkDeviceData>) => {
            const updatedDevices = new Map(prev)
            const deviceToRemove = updatedDevices.get(id)

            if (!deviceToRemove) {
                return prev
            }

            deviceToRemove.portsConnected.forEach((connectionInfo, edgeId) => {

                const otherDeviceId = connectionInfo.deviceConnected

                const otherDevice = updatedDevices.get(otherDeviceId)

                if (otherDevice) {
                    otherDevice.portsConnected.delete(edgeId)
                }
            })

            updatedDevices.delete(id)

            return updatedDevices
        })
    }

    const connectDevices = (edgeId: string, device: { id: string, port: string }, sourceDevice: { id: string, port: string }) => {

        setDevices(currentDevices => {
            const newDevices = new Map(currentDevices);

            const device1 = newDevices.get(device.id);
            const device2 = newDevices.get(sourceDevice.id);

            if (!device1 || !device2) {
                return currentDevices;
            }

            const newDevice1 = {
                ...device1,
                portsConnected: new Map(device1.portsConnected)
            };
            newDevice1.portsConnected.set(edgeId, {
                deviceConnected: sourceDevice.id,
                port: device.port,
                deviceConnectedPort: sourceDevice.port
            });

            const newDevice2 = {
                ...device2,
                portsConnected: new Map(device2.portsConnected)
            };
            newDevice2.portsConnected.set(edgeId, {
                deviceConnected: device.id,
                port: sourceDevice.port,
                deviceConnectedPort: device.port
            });

            newDevices.set(device.id, newDevice1);
            newDevices.set(sourceDevice.id, newDevice2);

            return newDevices;
        });
    }

    const disconnectDevices = (edgeId: string) => {

        setDevices(currentDevices => {
            const newDevices = new Map(currentDevices);
            let hasChanged = false;

            for (const [deviceId, deviceData] of newDevices.entries()) {
                if (deviceData.portsConnected.has(edgeId)) {
                    hasChanged = true;
                    const newDeviceData = {
                        ...deviceData,
                        portsConnected: new Map(deviceData.portsConnected)
                    };
                    newDeviceData.portsConnected.delete(edgeId);
                    newDevices.set(deviceId, newDeviceData);
                }
            }

            return hasChanged ? newDevices : currentDevices;
        });

    }

    const updateDeviceConfig = (id: string, config: Partial<NetworkDeviceData["config"]>) => {
        const device = devices.get(id);
        if (device?.type === 'pc' && config?.ipv4Mode !== 'dhcp') {
            releaseDhcpLease(id);
        }

        setDevices(prev => {
            const updated = new Map(prev);
            const device = updated.get(id);

            if (device) {
                const newDevice = {
                    ...device,
                    config: {
                        ...device.config,
                        ...config,
                    }
                };
                updated.set(id, newDevice);
            }

            return updated;
        });
    }
    const exportConfig = (deviceId: string) => {
        const device = devices.get(deviceId);

        if (!device || !device.config) {
            return "";
        }

        let output = "";
        const config = device.config;

        if (config.hostname) {
            output += `hostname ${config.hostname}\n`;
        }
        if (config.defaultGateway) {
            output += `ip default-gateway ${config.defaultGateway}\n`;
        }

        switch (device.type) {
            case "switch":
                output = exportSwitchConfig(device, output)
                break;
            case "router":
                output = exportRouterConfig(device, output)
                break
            case "pc":
                output = exportPcConfig(device, output)
                break
            default:
                break;
        }

        return output;
    }

    return (
        <ScenarioContext.Provider value={{
            devices, addPc, addRouter, addSwitch, removeDevice, connectDevices,
            disconnectDevices, updateDeviceConfig, exportConfig,
            releaseDhcpLease, requestDhcpLease
        }}>
            {children}
        </ScenarioContext.Provider>
    )
}

export const useScenario = () => useContext(ScenarioContext)


function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1)
}