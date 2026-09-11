"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Trophy } from "lucide-react";
import { DetailCard } from "@/components/dashboard/detail-card";
import { Header } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import type { Competition } from "@/lib/models";

function decodeRouteId(value: string): string {
  try {
    return decodeURIComponent(value.replace(/~/g, "%"));
  } catch {
    return value;
  }
}

export default function CompetitionDetailPage() {
  const router = useRouter(),
    params = useParams();
  const id = useMemo(() => {
    const raw = (params as { id?: string | string[] })?.id,
      value = Array.isArray(raw) ? raw[0] : raw;
    return value ? decodeRouteId(value) : "";
  }, [params]);
  const [competition, setCompetition] = useState<Competition | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch(`/api/competitions?competitionId=${encodeURIComponent(id)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Lecture impossible.");
        if (active) setCompetition(data.competitions?.[0] || null);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Lecture impossible.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading)
    return (
      <>
        <Header title="Chargement…" />
        <div className="p-6 text-muted-foreground">
          Chargement de la compétition…
        </div>
      </>
    );
  if (error || !competition)
    return (
      <>
        <Header title="Compétition non trouvée" />
        <div className="p-6">
          <p className="text-destructive">
            {error || "La compétition demandée n’existe pas."}
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </div>
      </>
    );

  return (
    <div className="flex flex-col">
      <Header
        title={`Compétition : ${competition.nom}`}
        subtitle={competition.saison}
      />
      <main className="space-y-6 p-6">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à la liste
        </Button>
        <div className="grid gap-6 lg:grid-cols-2">
          <DetailCard
            title="Informations générales"
            icon={Trophy}
            fields={[
              { label: "ID", value: competition.id },
              { label: "Nom", value: competition.nom },
              { label: "Type", value: competition.typeCompetition },
              { label: "Discipline", value: competition.discipline },
              { label: "Saison", value: competition.saison },
              { label: "Statut", value: competition.statut },
            ]}
          />
          <DetailCard
            title="Organisation"
            icon={MapPin}
            fields={[
              { label: "Date de début", value: competition.dateDebut },
              { label: "Date de fin", value: competition.dateFin },
              { label: "Pays", value: competition.pays },
              { label: "Observations", value: competition.observation || "-" },
            ]}
          />
        </div>
      </main>
    </div>
  );
}
