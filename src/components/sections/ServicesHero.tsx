"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface ServicesHeroProps {
  title: string;
  description: string;
  searchPlaceholder?: string;
  searchButtonText?: string;
  onSearchChange?: (query: string) => void;
}

export function ServicesHero({
  title,
  description,
  searchPlaceholder = "What service are you looking for?",
  searchButtonText = "Search",
  onSearchChange,
}: ServicesHeroProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Filter services by search query - could navigate to filtered view
      // For now, just scroll to services section
      const servicesSection = document.getElementById("services-section");
      if (servicesSection) {
        servicesSection.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearchChange?.(value);
  };

  return (
    <section className="relative bg-siam-blue py-16 sm:py-20 md:py-24 lg:py-28">
      {/* Subtle grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />
      <div className="container relative mx-auto px-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
          {title}
        </h1>
        {description && (
          <p className="mx-auto mt-4 max-w-3xl text-base text-white/95 sm:text-lg md:text-xl lg:mt-6">
            {description}
          </p>
        )}
        <form onSubmit={handleSearch} className="mx-auto mt-8 max-w-2xl sm:mt-10 md:mt-12">
          <div className="flex gap-0 rounded-2xl bg-white p-1.5 shadow-xl dark:bg-gray-900">
            <div className="flex flex-1 items-center gap-3 px-4 py-3">
              <Search className="h-5 w-5 shrink-0 text-gray-400 dark:text-gray-500" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={handleInputChange}
                className="h-auto border-0 bg-transparent p-0 text-base text-gray-900 placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
            </div>
            <Button 
              type="submit" 
              className="rounded-xl bg-siam-blue px-6 py-3 text-base font-medium text-white hover:bg-siam-blue-light focus-visible:ring-2 focus-visible:ring-siam-blue focus-visible:ring-offset-2"
            >
              {searchButtonText}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
