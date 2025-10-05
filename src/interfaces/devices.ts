import { IRouterSubInterfaceConfig } from "@/components/deviceMenus/configsForms/router-form";
import { IChannelGroup, IVlan } from "@/components/deviceMenus/configsForms/switch-form";

export type IPortModes = 'trunk' | 'access'

export interface NetworkDeviceData {
    type: 'switch' | 'router' | 'pc';
    label: string;

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
            // Para switch
            isUp?: boolean;
            mode?: 'access' | 'trunk';
            accessVlan?: string;
            trunkVlans?: string[];
            nativeVlan?: string;
            bpduGuard?: boolean;
            portfast?: boolean;
            // Para router
            ip?: string;
            subnetMask?: string;
            description?: string;
            subInterfaces?: Record<string, IRouterSubInterfaceConfig>
        }>;
        dhcpExcluded?: string[]
    }

};