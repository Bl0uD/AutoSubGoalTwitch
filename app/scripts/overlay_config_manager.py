# ==================================================================
# MODULE DE CONFIGURATION DYNAMIQUE DES OVERLAYS
# ==================================================================
# Ce module permet au script Python OBS de modifier dynamiquement
# les propriétés visuelles des overlays HTML (police, couleurs, etc.)
# ==================================================================

import requests
import json
import os

class OverlayConfigManager:
    """Gestionnaire de configuration dynamique des overlays"""
    
    def __init__(self, server_url="http://localhost:8082"):
        self.server_url = server_url
        self.config_endpoint = f"{server_url}/api/overlay-config"
    
    def get_config(self):
        """Récupérer la configuration actuelle"""
        try:
            response = requests.get(self.config_endpoint, timeout=2)
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            print(f"❌ Erreur récupération config: {e}")
            return None
    
    def update_font(self, family=None, size=None, weight=None):
        """
        Mettre à jour la police des overlays
        
        Args:
            family (str): Nom de la police (ex: 'Arial', 'SEA', 'Courier New')
            size (str): Taille (ex: '64px', '48px')
            weight (str): Épaisseur (ex: 'normal', 'bold')
        """
        font_updates = {}
        if family is not None:
            font_updates['family'] = family
        if size is not None:
            font_updates['size'] = size
        if weight is not None:
            font_updates['weight'] = weight
        
        if font_updates:
            return self._send_update({'font': font_updates})
        return False
    
    def update_colors(self, text=None, shadow=None, stroke=None):
        """
        Mettre à jour les couleurs des overlays
        
        Args:
            text (str): Couleur du texte (ex: 'white', '#FF0000', 'rgb(255,0,0)')
            shadow (str): Couleur de l'ombre (ex: 'rgba(0,0,0,0.5)')
            stroke (str): Couleur du contour (ex: 'black', '#000000')
        """
        color_updates = {}
        if text is not None:
            color_updates['text'] = text
        if shadow is not None:
            color_updates['shadow'] = shadow
        if stroke is not None:
            color_updates['stroke'] = stroke
        
        if color_updates:
            return self._send_update({'colors': color_updates})
        return False
    
    def update_animation(self, duration=None, easing=None):
        """
        Mettre à jour les paramètres d'animation
        
        Args:
            duration (str): Durée (ex: '1s', '500ms')
            easing (str): Fonction d'easing (ex: 'ease-in-out', 'linear')
        """
        anim_updates = {}
        if duration is not None:
            anim_updates['duration'] = duration
        if easing is not None:
            anim_updates['easing'] = easing
        
        if anim_updates:
            return self._send_update({'animation': anim_updates})
        return False
    
    def update_layout(self, paddingLeft=None, gap=None):
        """
        Mettre à jour la mise en page
        
        Args:
            paddingLeft (str): Padding gauche (ex: '20px')
            gap (str): Espacement (ex: '10px', '0')
        """
        layout_updates = {}
        if paddingLeft is not None:
            layout_updates['paddingLeft'] = paddingLeft
        if gap is not None:
            layout_updates['gap'] = gap
        
        if layout_updates:
            return self._send_update({'layout': layout_updates})
        return False
    
    def update_full_config(self, font=None, colors=None, animation=None, layout=None):
        """
        Mettre à jour plusieurs sections en une seule fois
        
        Args:
            font (dict): {'family': 'Arial', 'size': '64px', 'weight': 'normal'}
            colors (dict): {'text': 'white', 'shadow': 'rgba(0,0,0,0.5)', 'stroke': 'black'}
            animation (dict): {'duration': '1s', 'easing': 'ease-in-out'}
            layout (dict): {'paddingLeft': '20px', 'gap': '0'}
        """
        updates = {}
        if font:
            updates['font'] = font
        if colors:
            updates['colors'] = colors
        if animation:
            updates['animation'] = animation
        if layout:
            updates['layout'] = layout
        
        if updates:
            return self._send_update(updates)
        return False
    
    def _send_update(self, updates):
        """Envoyer la mise à jour au serveur"""
        try:
            response = requests.post(
                self.config_endpoint,
                json=updates,
                headers={'Content-Type': 'application/json'},
                timeout=2
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    # Succès silencieux - pas de log
                    return True
                else:
                    print(f"❌ Erreur serveur: {result.get('error')}")
                    return False
            else:
                print(f"❌ Erreur HTTP {response.status_code}")
                return False
                
        except requests.exceptions.ConnectionError:
            print("❌ Impossible de se connecter au serveur (est-il démarré ?)")
            return False
        except Exception as e:
            print(f"❌ Erreur envoi config: {e}")
            return False


# ==================================================================
# EXEMPLE D'UTILISATION
# ==================================================================

if __name__ == "__main__":
    # Créer le gestionnaire
    config_manager = OverlayConfigManager()
    
    # Récupérer la config actuelle
    print("\n📄 Configuration actuelle:")
    current = config_manager.get_config()
    if current:
        print(json.dumps(current, indent=2))
    
    # Exemples de modifications
    print("\n🎨 Tests de modification:")
    
    # Changer la police
    print("\n1. Changement de police...")
    config_manager.update_font(family="Arial", size="48px")
    
    # Changer les couleurs
    print("\n2. Changement de couleurs...")
    config_manager.update_colors(text="#FF0000", stroke="#0000FF")
    
    # Changer l'animation
    print("\n3. Changement d'animation...")
    config_manager.update_animation(duration="2s", easing="ease-in-out")
    
    # Mise à jour complète
    print("\n4. Mise à jour complète...")
    config_manager.update_full_config(
        font={'family': 'SEA', 'size': '64px', 'weight': 'bold'},
        colors={'text': 'white', 'shadow': 'rgba(0,0,0,0.8)', 'stroke': 'black'},
        animation={'duration': '1s', 'easing': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'},
        layout={'paddingLeft': '30px', 'gap': '5px'}
    )
    
    print("\n✅ Tests terminés!")
