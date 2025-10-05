import { motion } from 'framer-motion'
import * as Tabs from '@radix-ui/react-tabs'

interface TabItemProps {
    value: string
    title: string
    isSelected: boolean
}

export default function TabItem({ isSelected, title, value }: TabItemProps) {
    return (
        <Tabs.Trigger
            value={value}
            className='relative px-1 pb-2 text-sm font-medium text-zinc-500
                hover:text-sky-500 data-[state=active]:text-sky-500
                cursor-pointer  
            '
        >
            <span
                className='text-base/5 font-bold text-nowrap select-none'
            >{title}</span>

            {isSelected && <>
                <motion.div
                    layoutId='activeTab'
                    className='absolute -bottom-[2.5px] left-0 right-0 h-[2.5px] bg-sky-500'
                />
            </>}

        </Tabs.Trigger>
    )
}