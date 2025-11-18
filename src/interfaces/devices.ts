import { IRouterSubInterfaceConfig } from "@/components/deviceMenus/configsForms/router-form";
import { IChannelGroup, IVlan } from "@/components/deviceMenus/configsForms/switch-form";

export type IPortModes = 'trunk' | 'access'

export interface IStaticRoute {
    id: string;
    network: string;
    subnetMask: string;
    nextHop: string;
}

export type IAclAction = 'permit' | 'deny';
export interface IAclRule {
    id: string;
    action: IAclAction;
    sourceIp: string;
    sourceWildcard: string;
}
export interface IAccessList {
    id: string;
    rules: IAclRule[];
}

export interface IOspfNetwork {
    id: string;
    ip: string;
    wildcard: string;
    area: string;
}
export interface IOspfConfig {
    processId: string;
    networks: IOspfNetwork[];
}

export interface IBgpNeighbor {
    id: string;
    ip: string;
    remoteAs: string;
}

export interface IBgpConfig {
    asNumber: string;
    neighbors: IBgpNeighbor[];
}

export interface NetworkDeviceData {
    type: 'switch' | 'router' | 'pc';
    label: string;
    position: { x: number; y: number }
    ports: string[];

    portsConnected: Map<string, {
        port: string,
        deviceConnected: string,
        deviceConnectedPort: string
    }>

    config?: {
        ipv4Mode?: string
        ipv4?: string
        ipv4Mask?: string
        hostname?: string;
        defaultGateway?: string;
        managementIp?: string;
        subnetMask?: string;
        managementVlanId?: string;
        vlans?: IVlan[];
        channelGroups?: IChannelGroup[];
        stp?: {
            rapid: boolean;
            primary: string[],
            secondary: string[]
        };
        interfaces?: Record<string, {
            isUp?: boolean;
            mode?: IPortModes;
            accessVlan?: string;
            trunkVlans?: string[];
            nativeVlan?: string;
            bpduGuard?: boolean;
            portfast?: boolean;
            ip?: string;
            subnetMask?: string;
            description?: string;
            subInterfaces?: Record<string, IRouterSubInterfaceConfig>
        }>;
        dhcpExcluded?: string[]
        ospf?: IOspfConfig;
        staticRoutes?: IStaticRoute[];
        accessLists?: IAccessList[];
        enableSecret?: string
        bgp?: IBgpConfig;
    }

};