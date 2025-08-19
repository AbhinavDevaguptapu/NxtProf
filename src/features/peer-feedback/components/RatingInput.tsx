import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Control } from "react-hook-form";

interface RatingInputProps {
    control: Control<any>;
    name: string;
    label: string;
}

const RatingInput = ({ control, name, label }: RatingInputProps) => {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem className="space-y-3">
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                        <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex justify-between"
                        >
                            {[1, 2, 3, 4, 5].map(value => (
                                <FormItem key={value} className="flex items-center space-x-2 space-y-0">
                                    <FormControl>
                                        <RadioGroupItem value={String(value)} />
                                    </FormControl>
                                    <FormLabel className="font-normal">{value}</FormLabel>
                                </FormItem>
                            ))}
                        </RadioGroup>
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
};

export default RatingInput;
