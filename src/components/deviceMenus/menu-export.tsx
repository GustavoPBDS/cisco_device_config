import { useScenario } from "@/contexts/scenario.context"
import { NetworkDeviceData } from "@/interfaces/devices"
import { ClipboardCopy, Copy, CopyCheckIcon, X } from "lucide-react"
import { useEffect, useState } from "react"
import { Node } from "reactflow"
import { toast } from "sonner"

interface IProps {
    onClose: () => void,
    node: Node<NetworkDeviceData>
}

export default function MenuExport({ node, onClose }: IProps) {

    const [configuration, setConfiguration] = useState('')
    const { exportConfig } = useScenario()

    useEffect(() => {
        if (node.data) {
            setConfiguration(exportConfig(node.id))
        }
    }, [node.data])


    const formatConfig = (text: string): string => {
        const blockStarters = ['interface ', 'vlan ', 'ip dhcp pool '];
        const blockEnders = ['!'];

        const lines = text.split('\n').filter(line => line.trim() !== '');

        let isInsideBlock = false;

        const formattedLines = lines.map(line => {
            const trimmedLine = line.trim();

            const startsNewBlock = blockStarters.some(starter => trimmedLine.startsWith(starter));
            const endsCurrentBlock = blockEnders.some(ender => trimmedLine.startsWith(ender));

            if (startsNewBlock || endsCurrentBlock) {
                isInsideBlock = false;
            }

            const resultLine = isInsideBlock ? '\t' + trimmedLine : trimmedLine;

            if (startsNewBlock) {
                isInsideBlock = true;
            }

            return resultLine;
        });

        return formattedLines.join('\n');
    };

    const exportConfiguration = async () => {
        const configuration = exportConfig(node.id)
        try {
            await navigator.clipboard.writeText(configuration)
            toast.success('Configuração copiada para a área de transferência')
        } catch (err) {
            toast.error('Ocorreu um erro')
        }
    }

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
                <div>

                    <pre className="w-full flex-wrap">
                        <code>
                            {formatConfig(configuration)}
                        </code>
                    </pre>

                    <footer>
                        <button
                            onClick={exportConfiguration}
                            type="button"
                            className="absolute bottom-2.5 right-8 py-1 px-3 w-fit bg-green-500 rounded-md cursor-pointer hover:opacity-90 flex items-center gap-1 text-sm"
                        >
                            Copiar Configuração
                            <ClipboardCopy />
                        </button>
                    </footer>
                </div>
            </div>
        </div>
    )
}