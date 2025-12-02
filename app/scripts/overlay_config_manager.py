# ==================================================================
# MODULE DE CONFIGURATION DYNAMIQUE DES OVERLAYS
# ==================================================================
# Ce module permet au script Python OBS de modifier dynamiquement
# les propriétés visuelles des overlays HTML (police, couleurs, etc.)
# ==================================================================

import json
import os
import time
import re
import logging

# Import optionnel de requests
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    print("⚠️ Module 'requests' non disponible - OverlayConfigManager désactivé")

class OverlayConfigManager:
    """Gestionnaire de configuration dynamique des overlays"""
    
    def __init__(self, server_url="http://localhost:8082", timeout=5, enable_cache=True):
        if not REQUESTS_AVAILABLE:
            raise ImportError("Le module 'requests' est requis pour OverlayConfigManager")
        
        self.server_url = server_url
        self.config_endpoint = f"{server_url}/api/overlay-config"
        self.timeout = timeout
        self.enable_cache = enable_cache
        self._cache = {} if enable_cache else None
        self.logger = logging.getLogger(__name__)
    
    def get_config(self, use_cache=True):
        """Récupérer la configuration actuelle
        
        Args:
            use_cache (bool): Utiliser le cache si disponible
        """
        # Retourner depuis le cache si activé
        if use_cache and self._cache and 'full_config' in self._cache:
            return self._cache['full_config']
        
        try:
            response = requests.get(self.config_endpoint, timeout=self.timeout)
            if response.status_code == 200:
                config = response.json()
                if self._cache is not None:
                    self._cache['full_config'] = config
                return config
            else:
                self.logger.warning(f"HTTP {response.status_code} lors de la récupération config")
            return None
        except requests.exceptions.ConnectionError:
            self.logger.error("Impossible de se connecter au serveur")
            return None
        except Exception as e:
            self.logger.error(f"Erreur récupération config: {e}", exc_info=True)
            return None
    
    def update_font(self, family=None, size=None, weight=None):
        """
        Mettre à jour la police des overlays
        
        Args:
            family (str): Nom de la police (ex: 'Arial', 'Courier New')
            size (str): Taille (ex: '64px', '48px')
            weight (str): Épaisseur (ex: 'normal', 'bold', '100'-'900')
        
        Raises:
            ValueError: Si les paramètres sont invalides
        """
        font_updates = {}
        
        if family is not None:
            font_updates['family'] = family
        
        if size is not None:
            # Valider le format CSS (px, em, rem, %)
            if not re.match(r'^\d+(\.\d+)?(px|em|rem|%|pt)$', str(size)):
                raise ValueError(f"Format taille invalide: '{size}'. Attendu: '64px', '2em', etc.")
            font_updates['size'] = size
        
        if weight is not None:
            # Valider le poids (normal, bold, 100-900)
            valid_weights = ['normal', 'bold', 'lighter', 'bolder'] + [str(i) for i in range(100, 1000, 100)]
            if str(weight) not in valid_weights:
                raise ValueError(f"Poids invalide: '{weight}'. Attendu: normal, bold, 100-900")
            font_updates['weight'] = weight
        
        if font_updates:
            # Vérifier le cache avant envoi
            cache_key = f"font_{json.dumps(font_updates, sort_keys=True)}"
            if self._is_cached(cache_key):
                return True
            
            if self._send_update({'font': font_updates}):
                self._set_cache(cache_key, True)
                return True
        return False
    
    def update_colors(self, text=None, shadow=None, stroke=None):
        """
        Mettre à jour les couleurs des overlays
        
        Args:
            text (str): Couleur du texte (ex: 'white', '#FF0000', 'rgb(255,0,0)')
            shadow (str): Couleur de l'ombre (ex: 'rgba(0,0,0,0.5)')
            stroke (str): Couleur du contour (ex: 'black', '#000000')
        
        Raises:
            ValueError: Si le format couleur est invalide
        """
        color_updates = {}
        
        if text is not None:
            if not self._is_valid_color(text):
                raise ValueError(f"Format couleur invalide: '{text}'")
            color_updates['text'] = text
        
        if shadow is not None:
            if not self._is_valid_color(shadow):
                raise ValueError(f"Format couleur invalide: '{shadow}'")
            color_updates['shadow'] = shadow
        
        if stroke is not None:
            if not self._is_valid_color(stroke):
                raise ValueError(f"Format couleur invalide: '{stroke}'")
            color_updates['stroke'] = stroke
        
        if color_updates:
            cache_key = f"colors_{json.dumps(color_updates, sort_keys=True)}"
            if self._is_cached(cache_key):
                return True
            
            if self._send_update({'colors': color_updates}):
                self._set_cache(cache_key, True)
                return True
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
            # Valider format durée
            if not re.match(r'^\d+(\.\d+)?(s|ms)$', str(duration)):
                raise ValueError(f"Format durée invalide: '{duration}'. Attendu: '1s', '500ms'")
            anim_updates['duration'] = duration
        
        if easing is not None:
            anim_updates['easing'] = easing
        
        if anim_updates:
            cache_key = f"animation_{json.dumps(anim_updates, sort_keys=True)}"
            if self._is_cached(cache_key):
                return True
            
            if self._send_update({'animation': anim_updates}):
                self._set_cache(cache_key, True)
                return True
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
            cache_key = f"layout_{json.dumps(layout_updates, sort_keys=True)}"
            if self._is_cached(cache_key):
                return True
            
            if self._send_update({'layout': layout_updates}):
                self._set_cache(cache_key, True)
                return True
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
    
    def _send_update(self, updates, retries=3):
        """Envoyer la mise à jour au serveur avec retry automatique
        
        Args:
            updates (dict): Mises à jour à envoyer
            retries (int): Nombre de tentatives (défaut: 3)
        
        Returns:
            bool: True si succès, False sinon
        """
        for attempt in range(retries):
            try:
                response = requests.post(
                    self.config_endpoint,
                    json=updates,
                    headers={'Content-Type': 'application/json'},
                    timeout=self.timeout
                )
                
                # Succès
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        return True
                    else:
                        self.logger.error(f"Erreur serveur: {result.get('error')}")
                        return False
                
                # Erreur serveur (5xx) -> retry
                elif response.status_code >= 500:
                    if attempt < retries - 1:
                        wait_time = 2 ** attempt  # Backoff exponentiel: 1s, 2s, 4s
                        self.logger.warning(f"HTTP {response.status_code}, retry {attempt + 2}/{retries} dans {wait_time}s")
                        time.sleep(wait_time)
                        continue
                    else:
                        self.logger.error(f"HTTP {response.status_code} après {retries} tentatives")
                        return False
                
                # Erreur client (4xx) -> pas de retry
                else:
                    self.logger.error(f"HTTP {response.status_code}")
                    return False
                    
            except requests.exceptions.Timeout:
                if attempt < retries - 1:
                    wait_time = 2 ** attempt
                    self.logger.warning(f"Timeout, retry {attempt + 2}/{retries} dans {wait_time}s")
                    time.sleep(wait_time)
                else:
                    self.logger.error(f"Timeout après {retries} tentatives")
                    return False
                    
            except requests.exceptions.ConnectionError:
                if attempt < retries - 1:
                    wait_time = 2 ** attempt
                    self.logger.warning(f"Connexion refusée, retry {attempt + 2}/{retries} dans {wait_time}s")
                    time.sleep(wait_time)
                else:
                    self.logger.error("Impossible de se connecter au serveur")
                    return False
                    
            except Exception as e:
                self.logger.error(f"Erreur envoi config: {e}", exc_info=True)
                return False
        
        return False
    
    def _is_valid_color(self, color):
        """Valide un code couleur CSS
        
        Args:
            color (str): Couleur à valider
        
        Returns:
            bool: True si valide
        """
        if not color or not isinstance(color, str):
            return False
        
        color = color.strip()
        
        # Noms de couleurs CSS
        css_colors = [
            'white', 'black', 'red', 'green', 'blue', 'yellow', 'cyan', 'magenta',
            'orange', 'purple', 'pink', 'brown', 'gray', 'grey', 'transparent'
        ]
        if color.lower() in css_colors:
            return True
        
        # Patterns CSS
        patterns = [
            r'^#[0-9A-Fa-f]{3}$',  # #RGB
            r'^#[0-9A-Fa-f]{6}$',  # #RRGGBB
            r'^#[0-9A-Fa-f]{8}$',  # #RRGGBBAA
            r'^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$',
            r'^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*[\d.]+\s*\)$'
        ]
        
        for pattern in patterns:
            if re.match(pattern, color):
                # Valider RGB values <= 255
                if 'rgb' in color:
                    numbers = re.findall(r'\d{1,3}', color)
                    if any(int(n) > 255 for n in numbers[:3]):
                        return False
                return True
        
        return False
    
    def _is_cached(self, key):
        """Vérifie si une valeur est en cache"""
        return self._cache is not None and key in self._cache
    
    def _set_cache(self, key, value):
        """Met en cache une valeur"""
        if self._cache is not None:
            self._cache[key] = value
    
    def clear_cache(self):
        """Vide le cache"""
        if self._cache is not None:
            self._cache.clear()


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
        font={'family': 'Arial', 'size': '64px', 'weight': 'bold'},
        colors={'text': 'white', 'shadow': 'rgba(0,0,0,0.8)', 'stroke': 'black'},
        animation={'duration': '1s', 'easing': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'},
        layout={'paddingLeft': '30px', 'gap': '5px'}
    )
    
    print("\n✅ Tests terminés!")
