import { NetworkDeviceData } from "@/interfaces/devices"
import { X } from "lucide-react"
import { Node } from "reactflow"
import PcForm from "./configsForms/pc-form"
import SwitchForm from "./configsForms/switch-form"
import RouterForm from "./configsForms/router-form"

interface IProps {
    onClose: () => void,
    node: Node<NetworkDeviceData>
}

export default function MenuConfiguration({ onClose, node }: IProps) {

    return (
        <div className="w-[95vw] max-w-lg max-h-[70vh] flex flex-col flex-1 divide-zinc-400 p-4 pb-13 rounded-lg bg-gray-800 fixed left-2.5 top-2.5 z-10">
            <div className="flex items-center justify-between max-w-screen z-20 pb-2 border-b-2 border-b-gray-600">

                <h3 >Configuração do dispositivo:
                    <span className="font-bold">
                        {` ${node.data.label}`}
                    </span>
                </h3>

                <span onClick={onClose}
                    className="cursor-pointer"
                >
                    <X />
                </span>

            </div>
            <div className="w-full overflow-y-scroll scrollbar-thumb-rounded-full scrollbar-track-rounded-full scrollbar scrollbar-thumb-slate-500 scrollbar-track-transparent">
                {node.data.type === 'pc' && <PcForm
                    node={node}
                    onClose={onClose}
                />}
                {node.data.type === 'switch' && <SwitchForm
                    node={node}
                    onClose={onClose}
                />}
                {node.data.type === 'router' && <RouterForm
                    node={node}
                    onClose={onClose}
                />}
            </div>
        </div>
    )
}