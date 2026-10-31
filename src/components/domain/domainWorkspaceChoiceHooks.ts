import { useEffect, type Dispatch, type SetStateAction } from "react";

import type { EntityFormDynamicChoices } from "./EntityForm";
import type { CrudOption } from "@/domains/crudConfig";
import type { Person } from "@/domains/people/types";
import type { PresentationType } from "@/domains/presentations/types";
import type { Song } from "@/domains/songs/types";
import { apiFetch } from "@/lib/api";
import { userFacingError } from "@/lib/userMessages";

type SetChoices = Dispatch<SetStateAction<EntityFormDynamicChoices>>;

export async function loadPresentationTypeChoices(): Promise<
  Array<
    CrudOption &
      Pick<PresentationType, "isPublicByDefault" | "isActive" | "isSystem">
  >
> {
  const types = await apiFetch<PresentationType[]>("/presentation-types");
  return types.map((type) => ({
    value: String(type.id),
    label: type.name,
    icon: type.icon ?? "event",
    isPublicByDefault: type.isPublicByDefault,
    isActive: type.isActive,
    isSystem: type.isSystem,
  }));
}

export async function loadPresentationSongChoices(): Promise<CrudOption[]> {
  const songs = await apiFetch<Song[]>("/songs");
  return songs.map((song) => ({
    value: String(song.id),
    label:
      [song.title, song.composer].filter(Boolean).join(" · ") ||
      `Música #${song.id}`,
    icon: "library_music",
  }));
}

export function usePeopleChoices(enabled: boolean, setChoices: SetChoices) {
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    apiFetch<Array<Pick<Person, "id" | "firstName" | "lastName" | "userId">>>(
      "/people",
    )
      .then((data) => {
        if (!active) return;
        setChoices((current) => ({
          ...current,
          people: data.map((person) => ({
            value: String(person.id),
            label:
              `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() ||
              String(person.id),
            hasUser: person.userId != null && person.userId !== "",
          })),
        }));
      })
      .catch(() => {
        if (active) setChoices((current) => ({ ...current, people: null }));
      });
    return () => {
      active = false;
    };
  }, [enabled, setChoices]);
}

export function useInstrumentChoices(enabled: boolean, setChoices: SetChoices) {
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    apiFetch<
      Array<{
        id: string | number;
        name?: string;
        tuning?: string;
        status?: string;
      }>
    >("/instruments")
      .then((data) => {
        if (!active) return;
        setChoices((current) => ({
          ...current,
          instruments: data
            .filter((item) => item.status !== "inactive")
            .map((item) => ({
              value: String(item.id),
              label:
                [item.name, item.tuning].filter(Boolean).join(" · ") ||
                String(item.id),
            })),
        }));
      })
      .catch(() => {
        if (active) setChoices((current) => ({ ...current, instruments: null }));
      });
    return () => {
      active = false;
    };
  }, [enabled, setChoices]);
}

export function usePresentationTypeChoices(
  enabled: boolean,
  request: number,
  setChoices: SetChoices,
) {
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setChoices((current) => ({
      ...current,
      presentationTypesLoading: true,
      presentationTypesError: null,
    }));
    loadPresentationTypeChoices()
      .then((presentationTypes) => {
        if (active)
          setChoices((current) => ({
            ...current,
            presentationTypes,
            presentationTypesError: null,
          }));
      })
      .catch((caught: unknown) => {
        if (active)
          setChoices((current) => ({
            ...current,
            presentationTypes: null,
            presentationTypesError: userFacingError(
              caught,
              "Não foi possível carregar os tipos de evento.",
            ),
          }));
      })
      .finally(() => {
        if (active)
          setChoices((current) => ({
            ...current,
            presentationTypesLoading: false,
          }));
      });
    return () => {
      active = false;
    };
  }, [enabled, request, setChoices]);
}

export function usePresentationSongChoices(
  enabled: boolean,
  request: number,
  setChoices: SetChoices,
) {
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    loadPresentationSongChoices()
      .then((songs) => {
        if (active)
          setChoices((current) => ({ ...current, songs, songsError: null }));
      })
      .catch((caught: unknown) => {
        if (active)
          setChoices((current) => ({
            ...current,
            songs: null,
            songsError: userFacingError(
              caught,
              "Não foi possível carregar as músicas do repertório.",
            ),
          }));
      })
      .finally(() => {
        if (active)
          setChoices((current) => ({ ...current, songsLoading: false }));
      });
    return () => {
      active = false;
    };
  }, [enabled, request, setChoices]);
}
