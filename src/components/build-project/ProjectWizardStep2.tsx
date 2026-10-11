// src/components/build-project/ProjectWizardStep2.tsx
import { useState, useMemo, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { allSaudiCities, type SaudiCity } from "@/data/saudiCities";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Sparkles,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

interface Props {
  city: string;
  setCity: (v: string) => void;
  areaSqm: string;
  setAreaSqm: (v: string) => void;
  floors: string;
  setFloors: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const ProjectWizardStep2 = ({
  city,
  setCity,
  areaSqm,
  setAreaSqm,
  floors,
  setFloors,
  onNext,
  onBack,
}: Props) => {
  const { isRTL } = useLanguage();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const cities = useMemo(() => {
    return allSaudiCities.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const selectedCity = cities.find((c) => c.name === city);

  const filteredCities = useMemo(() => {
    if (!search) return cities;
    const q = search.toLowerCase();
    return cities.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.nameAr.includes(q) ||
        (c.province && c.province.toLowerCase().includes(q)),
    );
  }, [cities, search]);

  const handleSelect = useCallback(
    (cityName: string) => {
      setCity(cityName);
      setOpen(false);
      setSearch("");
    },
    [setCity],
  );

  // Input validation handlers
  const handleAreaChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (value === "") {
        setAreaSqm("");
        return;
      }
      const num = Number(value);
      if (!isNaN(num) && num >= 0 && num <= 1000000) {
        setAreaSqm(value);
      }
    },
    [setAreaSqm],
  );

  const handleFloorsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (value === "") {
        setFloors("");
        return;
      }
      const num = Number(value);
      if (!isNaN(num) && num >= 0 && num <= 200) {
        setFloors(value);
      }
    },
    [setFloors],
  );

  const isValid =
    city && areaSqm && Number(areaSqm) >= 1 && floors && Number(floors) >= 1;

  const triggerButton = (
    <Button
      variant="outline"
      role="combobox"
      aria-expanded={open}
      className="w-full h-12 justify-between bg-white border border-[#d8d6df] hover:border-[#533afd] font-light text-left rounded-[4px] transition-all"
    >
      <span className="truncate text-[#061b31]">
        {selectedCity
          ? isRTL
            ? selectedCity.nameAr
            : `${selectedCity.name}${selectedCity.province ? ` — ${selectedCity.province}` : ""}`
          : isRTL
            ? "ابحث واختر المدينة..."
            : "Search and select city..."}
      </span>
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-[#64748d]" />
    </Button>
  );

  const cityList = (
    <Command shouldFilter={false}>
      <CommandInput
        placeholder={isRTL ? "ابحث عن مدينة..." : "Search city..."}
        value={search}
        onValueChange={setSearch}
        className="border-b border-[#d8d6df]"
      />
      <CommandList className={cn("max-h-60", isMobile && "max-h-[50vh]")}>
        <CommandEmpty className="text-[#64748d] py-6 text-center">
          {isRTL ? "لا توجد نتائج" : "No city found."}
        </CommandEmpty>
        <CommandGroup>
          {filteredCities.map((c) => (
            <CommandItem
              key={c.slug}
              value={c.slug}
              onSelect={() => handleSelect(c.name)}
              className="flex items-center gap-2 cursor-pointer hover:bg-[#e5edf5] data-[selected=true]:bg-[#e5edf5]"
            >
              <Check
                className={cn(
                  "h-4 w-4 shrink-0",
                  city === c.name ? "opacity-100 text-[#533afd]" : "opacity-0",
                )}
              />
              <span className="truncate text-[#061b31]">
                {isRTL ? c.nameAr : c.name}
              </span>
              {c.province && (
                <span className="text-xs text-[#64748d] shrink-0">
                  ({c.province})
                </span>
              )}
              {c.isMetro && (
                <span className="text-[10px] bg-[#e5edf5] text-[#533afd] px-1.5 py-0.5 rounded-[4px] font-light shrink-0">
                  {isRTL ? "رئيسية" : "Metro"}
                </span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-6"
    >
      {/* Conversational header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-[4px] bg-[#e5edf5] flex items-center justify-center shrink-0">
          <MapPin className="w-5 h-5 text-[#533afd]" />
        </div>
        <div className="bg-[#f8fafd] rounded-[4px] rounded-tl-sm px-4 py-3 border border-[#d8d6df]">
          <p className="text-sm text-[#061b31] font-light">
            {isRTL
              ? "ممتاز! 📍 الآن أحتاج بعض التفاصيل — أين سيكون المشروع وما حجمه؟"
              : "Great choice! 📍 Now I need some details — where's the project located and how big is it?"}
          </p>
        </div>
      </div>

      {/* City Selector */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Label className="text-sm font-light mb-2 block text-[#061b31]">
          {isRTL ? "المدينة" : "City"}
        </Label>

        {isMobile ? (
          <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
            <DrawerContent className="px-0 pb-4">
              <div className="mt-2">{cityList}</div>
            </DrawerContent>
          </Drawer>
        ) : (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
            <PopoverContent
              className="w-[var(--radix-popover-trigger-width)] p-0 border-[#d8d6df] shadow-sm"
              align="start"
            >
              {cityList}
            </PopoverContent>
          </Popover>
        )}
      </motion.div>

      {/* Area & Floors Grid */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Label className="text-sm font-light mb-2 block text-[#061b31]">
            {isRTL ? "المساحة (م²)" : "Area (sqm)"}
          </Label>
          <Input
            type="number"
            value={areaSqm}
            onChange={handleAreaChange}
            placeholder="300"
            className="h-12 bg-white border border-[#d8d6df] focus:border-[#533afd] focus:ring-[#533afd]/10 rounded-[4px] transition-all font-light"
            min={1}
            max={1000000}
            inputMode="numeric"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Label className="text-sm font-light mb-2 block text-[#061b31]">
            {isRTL ? "عدد الأدوار" : "Number of Floors"}
          </Label>
          <Input
            type="number"
            value={floors}
            onChange={handleFloorsChange}
            placeholder="2"
            className="h-12 bg-white border border-[#d8d6df] focus:border-[#533afd] focus:ring-[#533afd]/10 rounded-[4px] transition-all font-light"
            min={1}
            max={200}
            inputMode="numeric"
          />
        </motion.div>
      </div>

      {/* Preview insight */}
      {city && areaSqm && Number(areaSqm) > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-[#e5edf5] border border-[#d8d6df] rounded-[4px] p-3 flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-[#533afd] shrink-0" />
          <p className="text-xs text-[#061b31] font-light">
            {isRTL
              ? `سيتم حساب الأسعار بناءً على أسعار السوق في ${selectedCity?.nameAr || city}`
              : `Prices will be estimated based on ${city} market rates`}
          </p>
        </motion.div>
      )}

      {/* Navigation Buttons */}
      <div className={cn("flex gap-3", isRTL && "flex-row-reverse")}>
        <Button
          variant="outline"
          onClick={onBack}
          className="h-12 gap-2 border border-[#d8d6df] hover:border-[#533afd] hover:bg-[#f8fafd] text-[#061b31] font-light rounded-[4px] transition-all"
        >
          {isRTL ? (
            <ArrowRight className="w-4 h-4" />
          ) : (
            <ArrowLeft className="w-4 h-4" />
          )}
          {isRTL ? "السابق" : "Back"}
        </Button>
        <Button
          onClick={onNext}
          disabled={!isValid}
          className="flex-1 h-12 text-base font-light bg-[#533afd] hover:bg-[#422bc7] text-white rounded-[4px] shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRTL ? (
            <>
              <ArrowLeft className="w-4 h-4" />
              التالي
            </>
          ) : (
            <>
              Next
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
};

export default ProjectWizardStep2;
