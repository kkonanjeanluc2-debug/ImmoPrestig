import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus, Trash2 } from "lucide-react";
import { RoomInspection } from "@/hooks/useEtatsDesLieux";
import { Badge } from "@/components/ui/badge";

interface RoomInspectionFormProps {
  rooms: RoomInspection[];
  onChange: (rooms: RoomInspection[]) => void;
  readOnly?: boolean;
}

const conditionColors: Record<string, string> = {
  excellent: "bg-green-500",
  bon: "bg-blue-500",
  moyen: "bg-yellow-500",
  mauvais: "bg-red-500",
};

const conditionLabels: Record<string, string> = {
  excellent: "Excellent",
  bon: "Bon",
  moyen: "Moyen",
  mauvais: "Mauvais",
};

export function RoomInspectionForm({ rooms, onChange, readOnly }: RoomInspectionFormProps) {
  const [newRoomName, setNewRoomName] = useState("");

  const updateRoom = (index: number, updates: Partial<RoomInspection>) => {
    if (readOnly) return;
    const newRooms = [...rooms];
    newRooms[index] = { ...newRooms[index], ...updates };
    onChange(newRooms);
  };

  const addRoom = () => {
    if (!newRoomName.trim() || readOnly) return;
    onChange([
      ...rooms,
      {
        name: newRoomName.trim(),
        condition: "bon",
        walls: "",
        floor: "",
        ceiling: "",
        windows: "",
        doors: "",
        electricity: "",
        plumbing: "",
        comments: "",
      },
    ]);
    setNewRoomName("");
  };

  const removeRoom = (index: number) => {
    if (readOnly) return;
    onChange(rooms.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex gap-2">
          <Input
            placeholder="Nom de la nouvelle pièce..."
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRoom())}
          />
          <Button type="button" onClick={addRoom} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </div>
      )}

      <Accordion type="multiple" className="w-full">
        {rooms.map((room, index) => (
          <AccordionItem key={index} value={`room-${index}`}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <span className="font-medium">{room.name}</span>
                <Badge className={`${conditionColors[room.condition]} text-white`}>
                  {conditionLabels[room.condition]}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div className="w-48">
                    <label className="text-sm font-medium">État général</label>
                    <Select
                      value={room.condition}
                      onValueChange={(value) => updateRoom(index, { condition: value as RoomInspection["condition"] })}
                      disabled={readOnly}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excellent">Excellent</SelectItem>
                        <SelectItem value="bon">Bon</SelectItem>
                        <SelectItem value="moyen">Moyen</SelectItem>
                        <SelectItem value="mauvais">Mauvais</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRoom(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Murs</label>
                    <Input
                      placeholder="État des murs..."
                      value={room.walls}
                      onChange={(e) => updateRoom(index, { walls: e.target.value })}
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Sol</label>
                    <Input
                      placeholder="État du sol..."
                      value={room.floor}
                      onChange={(e) => updateRoom(index, { floor: e.target.value })}
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Plafond</label>
                    <Input
                      placeholder="État du plafond..."
                      value={room.ceiling}
                      onChange={(e) => updateRoom(index, { ceiling: e.target.value })}
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Fenêtres</label>
                    <Input
                      placeholder="État des fenêtres..."
                      value={room.windows}
                      onChange={(e) => updateRoom(index, { windows: e.target.value })}
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Portes</label>
                    <Input
                      placeholder="État des portes..."
                      value={room.doors}
                      onChange={(e) => updateRoom(index, { doors: e.target.value })}
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Électricité</label>
                    <Input
                      placeholder="Prises, interrupteurs..."
                      value={room.electricity}
                      onChange={(e) => updateRoom(index, { electricity: e.target.value })}
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Plomberie</label>
                    <Input
                      placeholder="Robinets, tuyaux..."
                      value={room.plumbing}
                      onChange={(e) => updateRoom(index, { plumbing: e.target.value })}
                      disabled={readOnly}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Commentaires</label>
                  <Textarea
                    placeholder="Observations supplémentaires..."
                    value={room.comments}
                    onChange={(e) => updateRoom(index, { comments: e.target.value })}
                    disabled={readOnly}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {rooms.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          Aucune pièce ajoutée. Utilisez le champ ci-dessus pour ajouter des pièces.
        </p>
      )}
    </div>
  );
}
