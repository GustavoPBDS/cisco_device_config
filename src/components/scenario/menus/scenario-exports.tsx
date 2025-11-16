import TabItem from "@/components/TabItem";
import { ClipboardCopy, X } from "lucide-react";
import { Tabs } from "radix-ui";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface IProps {
    onClose: () => void;
    configurations: Record<string, string>[];
}

export default function ExportScenarioComponent({ onClose, configurations }: IProps) {
    const [isClient, setIsClient] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState<string | undefined>();

    function downloadJSON(data: unknown, filename: string): void {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = filename.endsWith('.json') ? filename : `${filename}.json`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    }

    const handleDownload = () => {
        downloadJSON(configurations, 'scenario_configurations.json')
    };

    useEffect(() => {
        if (configurations && configurations.length > 0) {
            const firstDeviceLabel = Object.keys(configurations[0])[0];
            setSelectedDevice(firstDeviceLabel);
        }
        setIsClient(true);
    }, [configurations]);

    const getSelectedConfig = (): string | undefined => {
        if (!selectedDevice) return undefined;
        const configObject = configurations.find(config => config.hasOwnProperty(selectedDevice));
        return configObject ? configObject[selectedDevice] : undefined;
    };

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
        const currentConfig = getSelectedConfig();
        if (!currentConfig) {
            toast.error('Nenhum dispositivo selecionado ou sem configuração.');
            return;
        }
        try {
            await navigator.clipboard.writeText(currentConfig);
            toast.success('Configuração copiada para a área de transferência');
        } catch (err) {
            toast.error('Ocorreu um erro ao copiar a configuração');
        }
    };

    if (!isClient) return null;

    return (
        <div className="w-[95vw] max-w-lg max-h-[70vh] flex flex-col flex-1 divide-zinc-400 p-4 pb-13 rounded-lg bg-gray-800 fixed left-2.5 top-2.5 z-50">
            <div className="flex items-center justify-between z-20 pb-2">
                <Tabs.Root
                    value={selectedDevice || ''}
                    onValueChange={setSelectedDevice}
                    className="overflow-x-auto overflow-y-hidden
                        scrollbar-thumb-rounded-full scrollbar-track-rounded-full scrollbar scrollbar-thumb-slate-500 scrollbar-track-transparent
                    "
                >
                    <Tabs.List className="flex gap-1">
                        {configurations.map((configObj) => {
                            const [label] = Object.keys(configObj);

                            return (
                                <TabItem
                                    key={label}
                                    isSelected={label === selectedDevice}
                                    title={label}
                                    value={label}
                                />
                            );
                        })}
                    </Tabs.List>
                </Tabs.Root>

                <span onClick={onClose} className="cursor-pointer ml-4">
                    <X />
                </span>
            </div>
            <div className="w-full overflow-y-scroll scrollbar-thumb-rounded-full scrollbar-track-rounded-full scrollbar scrollbar-thumb-slate-500 scrollbar-track-transparent mt-2">
                <div>
                    <pre className="w-full whitespace-pre-wrap">
                        <code>
                            {(() => {
                                const configText = getSelectedConfig();
                                return configText
                                    ? formatConfig(configText)
                                    : 'Dispositivo sem configuração...';
                            })()}
                        </code>
                    </pre>

                    <footer>
                        <button
                            onClick={handleDownload}
                            className="absolute bottom-2.5 left-4 py-1 px-3 w-fit bg-green-500 rounded-md cursor-pointer hover:opacity-90 flex items-center gap-1 text-sm disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                            Instalar JSON
                        </button>

                        <button
                            onClick={exportConfiguration}
                            type="button"
                            disabled={!selectedDevice}
                            className="absolute bottom-2.5 right-8 py-1 px-3 w-fit bg-green-500 rounded-md cursor-pointer hover:opacity-90 flex items-center gap-1 text-sm disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                            Copiar Configuração
                            <ClipboardCopy />
                        </button>
                    </footer>
                </div>
            </div>
        </div>
    );
}