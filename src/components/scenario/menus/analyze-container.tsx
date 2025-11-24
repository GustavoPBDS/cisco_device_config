import { AlertTriangle, Bot, CheckCircle, ClipboardList, LoaderCircle, Sparkles, X, XCircle } from "lucide-react";
import { IAnalyzeJsonParsed } from "../actionsContainer";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useScenario } from "@/contexts/scenario.context";
import { Tabs } from "radix-ui";
import TabItem from "@/components/TabItem";

interface IProps {
    onClose: () => void
    handleAnalyzeScenario: () => Promise<IAnalyzeJsonParsed[]>
}

export default function AnalyzeContainer({ onClose, handleAnalyzeScenario }: IProps) {
    const [loadingAnalyze, setLoadingAnalyze] = useState(false)
    const { analysisResult: analyze, storeAnalysisResult } = useScenario();
    const [selectedDevice, setSelectedDevice] = useState<string | undefined>();

    const handleAnalyze = async () => {
        if (loadingAnalyze) return toast.warning('O cenário ja está sendo analisado, aguarde alguns instantes...')
        setLoadingAnalyze(true)
        storeAnalysisResult(undefined)

        handleAnalyzeScenario()
            .then((res) => {
                console.log(res)
                if (res) {
                    storeAnalysisResult(res)
                }
            })
            .catch(() => {
                toast.error('Ocorreu um erro ao analisar o cenário')
            })
            .finally(() => {
                setLoadingAnalyze(false)
            })
    }

    useEffect(() => {
        if (analyze && analyze.length > 0) {
            setSelectedDevice(analyze[0].device);
        }
    }, [analyze])

    const EmptyState = () => (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-8">
            <Bot size={48} className="mb-4 text-gray-500" />
            <h3 className="font-semibold text-lg text-gray-200">Pronto para analisar</h3>
            <p className="text-sm">Clique em "Analisar cenário" para que a IA verifique as configurações e identifique possíveis problemas e melhorias.</p>
        </div>
    );
    const LoadingState = () => (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-8">
            <LoaderCircle size={48} className="mb-4 text-cyan-400 animate-spin" />
            <h3 className="font-semibold text-lg text-gray-200">Analisando seu cenário...</h3>
            <p className="text-sm">A IA está processando as configurações. Isso pode levar alguns segundos.</p>
        </div>
    );
    const currentDeviceData = analyze?.find(d => d.device === selectedDevice);
    return (
        <div className="w-[95vw] max-w-lg max-h-[70vh] flex flex-col flex-1 divide-zinc-400 p-4 pb-13 rounded-lg bg-gray-800 fixed left-2.5 top-2.5 z-50">
            <div className="flex items-center justify-between max-w-screen z-20 pb-2 border-b-2 border-b-gray-600">
                <h3>Analise do cenário</h3>

                <span onClick={onClose}
                    className="cursor-pointer"
                >
                    <X />
                </span>

            </div>
            <div className="w-full overflow-y-scroll scrollbar-thumb-rounded-full scrollbar-track-rounded-full scrollbar scrollbar-thumb-slate-500 scrollbar-track-transparent">

                <div className="w-full flex-grow overflow-y-auto scrollbar-thumb-rounded-full scrollbar-track-rounded-full scrollbar scrollbar-thumb-slate-500 scrollbar-track-transparent p-4">
                    {loadingAnalyze ? <LoadingState /> :
                        !analyze ? <EmptyState /> :
                            currentDeviceData && (
                                <>
                                    <Tabs.Root
                                        value={selectedDevice || ''}
                                        onValueChange={setSelectedDevice}
                                        className="overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-thumb-rounded-full scrollbar-track-rounded-full scrollbar scrollbar-thumb-slate-500 scrollbar-track-transparent pb-2"
                                    >
                                        <Tabs.List className="flex gap-1">
                                            {analyze.map(item => (
                                                <TabItem
                                                    key={item.device}
                                                    value={item.device}
                                                    title={item.device}
                                                    isSelected={item.device === selectedDevice}
                                                />
                                            ))}
                                        </Tabs.List>
                                    </Tabs.Root>

                                    <div className="mt-4 space-y-6 animate-fade-in">
                                        <section>
                                            <h2 className="text-lg font-bold text-cyan-400 mb-2 flex items-center gap-2">
                                                <ClipboardList size={20} /> Resumo da Análise
                                            </h2>
                                            <p className="text-gray-300 bg-gray-900/50 p-3 rounded-lg border border-gray-700 italic text-sm">
                                                {currentDeviceData.resumo}
                                            </p>
                                        </section>
                                        <section>
                                            <h2 className="text-lg font-bold text-red-400 mb-2 flex items-center gap-2">
                                                <AlertTriangle size={20} /> Problemas Identificados
                                            </h2>
                                            <ul className="space-y-2">
                                                {currentDeviceData.problemas.map((p, i) => (
                                                    <li key={i} className="flex items-start bg-red-900/20 p-3 rounded-md border border-red-500/30 text-sm">
                                                        <XCircle className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                                                        <span>{p}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </section>
                                        <section>
                                            <h2 className="text-lg font-bold text-green-400 mb-2 flex items-center gap-2">
                                                <Sparkles size={20} /> Sugestões de Melhoria
                                            </h2>
                                            <ul className="space-y-2">
                                                {currentDeviceData.melhorias.map((m, i) => (
                                                    <li key={i} className="flex items-start bg-green-900/20 p-3 rounded-md border border-green-500/30 text-sm">
                                                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                                                        <span>{m}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </section>
                                    </div>
                                </>
                            )
                    }
                </div>

                <footer>
                    <button
                        onClick={handleAnalyze}
                        type="button"
                        disabled={loadingAnalyze}
                        className="absolute bottom-2.5 right-8 py-1 px-3 w-fit bg-green-500 rounded-md cursor-pointer hover:opacity-90 flex items-center gap-1 text-sm disabled:cursor-not-allowed disabled:bg-green-700"
                    >
                        {loadingAnalyze ? (
                            <>
                                <LoaderCircle className="animate-spin" size={18} />
                                Analisando...
                            </>
                        ) : (
                            <>
                                Analisar Cenário
                                <Bot size={18} />
                            </>
                        )}
                    </button>
                </footer>
            </div>

            {loadingAnalyze && <div
                className="fixed top-0 left-0 w-screen h-screen z-[100] cursor-progress"
            />}
        </div>
    )
}