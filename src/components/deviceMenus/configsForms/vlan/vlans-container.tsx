import { Dispatch, SetStateAction, useState } from "react"
import { IVlan } from "../switch-form"
import { Plus, X } from "lucide-react"

interface IProps {
    vlans: IVlan[],
    setVlans: Dispatch<SetStateAction<IVlan[]>>
}

export default function VlansContainer({ vlans, setVlans }: IProps) {
    const [errors, setErrors] = useState<Record<number, { id?: string; name?: string, existId?: string }>>({})

    const addVlan = () => {
        setVlans([...vlans, { id: '', name: '' }])
    }

    const validateVlanId = (value: string) => {
        const num = Number(value)
        if (!value) return "VLAN ID é obrigatório"
        if (isNaN(num)) return "VLAN ID deve ser numérico"
        if (num < 1 || num > 4094) return "VLAN ID deve estar entre 1 e 4094"

        const exists = vlans.some((vlan) => vlan.id === value)
        if (exists) return 'Essa VLAN ID ja existe'
        return ""
    }

    const validateVlanName = (value: string) => {
        if (!value) return "Nome da VLAN é obrigatório"
        if (value.length > 32) return "Máx. 32 caracteres"
        return ""
    }

    const handleVlanChange = (index: number, field: keyof IVlan, value: string) => {
        const updatedVlans = vlans.map((vlan, i) => {
            if (i === index) {
                return { ...vlan, [field]: value }
            }
            return vlan
        })
        setVlans(updatedVlans)

        // validação em tempo real
        setErrors(prev => {
            const newErrors = { ...prev }
            if (!newErrors[index]) newErrors[index] = {}
            if (field === "id") {
                newErrors[index].id = validateVlanId(value)
            }
            if (field === "name") {
                newErrors[index].name = validateVlanName(value)
            }

            return { ...newErrors }
        })
    }

    const removeVlan = (indexToRemove: number) => {
        if (vlans.length === 1) {
            setVlans([{ name: '', id: '' }])
            setErrors({})
            return
        }

        const filteredVlans = vlans.filter((_, index) => index !== indexToRemove)
        setVlans(filteredVlans)

        // remove os erros daquele índice
        const newErrors = { ...errors }
        delete newErrors[indexToRemove]
        setErrors(newErrors)
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
                {vlans.map((vlan, i) => (
                    <div
                        key={i}
                        className="flex flex-col gap-1 w-full"
                    >
                        <div className="flex items-center gap-1">
                            <input
                                type="text"
                                placeholder={`VLAN ID`}
                                value={vlan.id}
                                onChange={e => handleVlanChange(i, 'id', e.target.value)}
                                className="bg-gray-900 rounded-lg p-2 text-sm flex-1 min-w-0 focus:outline-none"
                            />
                            <input
                                type="text"
                                placeholder={`VLAN Name`}
                                value={vlan.name}
                                onChange={e => handleVlanChange(i, 'name', e.target.value)}
                                className="bg-gray-900 rounded-lg p-2 text-sm flex-1 min-w-0 focus:outline-none"
                            />
                            <span
                                className="cursor-pointer"
                                onClick={() => removeVlan(i)}
                            >
                                <X className="w-6 h-6 text-red-500" />
                            </span>
                        </div>
                        {/* mensagens de erro */}
                        <div className="flex flex-col text-red-400 text-xs">
                            {errors[i]?.id && <span>{errors[i].id}</span>}
                            {errors[i]?.name && <span>{errors[i].name}</span>}
                            {errors[i]?.existId && <span>{errors[i].existId}</span>}
                        </div>
                    </div>
                ))}
            </div>
            <button
                type="button"
                onClick={addVlan}
                className="self-start p-1.5 text-sm bg-emerald-500 flex items-center rounded-sm w-fit cursor-pointer"
            >
                <Plus className="h-5 w-5" /> Adicionar Vlan
            </button>
        </div>
    )
}
