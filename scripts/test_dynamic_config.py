#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script de test pour le système de configuration dynamique des overlays
Utiliser ce script pour tester rapidement les modifications visuelles
"""

import sys
import os
import time

# Ajouter le dossier obs au path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'obs'))

from overlay_config_manager import OverlayConfigManager

def print_separator():
    print("\n" + "="*60 + "\n")

def test_connection():
    """Test 1 : Connexion au serveur"""
    print("🔌 Test 1 : Connexion au serveur")
    print("-" * 60)
    
    config = OverlayConfigManager()
    current = config.get_config()
    
    if current:
        print("✅ Serveur accessible")
        print("📄 Configuration actuelle :")
        import json
        print(json.dumps(current, indent=2))
        return config
    else:
        print("❌ Impossible de se connecter au serveur")
        print("💡 Assurez-vous que le serveur Node.js est démarré")
        return None

def test_font_change(config):
    """Test 2 : Changement de police"""
    print_separator()
    print("🎨 Test 2 : Changement de police")
    print("-" * 60)
    
    fonts = [
        ("Arial", "72px"),
        ("Courier New", "56px"),
        ("SEA", "64px")  # Retour à l'original
    ]
    
    for font_family, font_size in fonts:
        print(f"\n📝 Application : {font_family} @ {font_size}")
        success = config.update_font(family=font_family, size=font_size)
        
        if success:
            print(f"   ✅ {font_family} appliqué")
        else:
            print(f"   ❌ Échec")
        
        time.sleep(2)  # Pause pour voir le changement

def test_color_change(config):
    """Test 3 : Changement de couleurs"""
    print_separator()
    print("🌈 Test 3 : Changement de couleurs")
    print("-" * 60)
    
    color_schemes = [
        ("Rouge vif", "#FF0000", "rgba(255,0,0,0.8)", "#000000"),
        ("Bleu néon", "#00FFFF", "rgba(0,255,255,0.8)", "#0000FF"),
        ("Vert Matrix", "#00FF00", "rgba(0,255,0,0.8)", "#003300"),
        ("Blanc classique", "white", "rgba(0,0,0,0.5)", "black")  # Original
    ]
    
    for name, text, shadow, stroke in color_schemes:
        print(f"\n🎨 Application : {name}")
        success = config.update_colors(text=text, shadow=shadow, stroke=stroke)
        
        if success:
            print(f"   ✅ {name} appliqué")
        else:
            print(f"   ❌ Échec")
        
        time.sleep(2)

def test_animation_change(config):
    """Test 4 : Changement d'animation"""
    print_separator()
    print("⚡ Test 4 : Changement d'animation")
    print("-" * 60)
    
    animations = [
        ("Ultra rapide", "300ms", "linear"),
        ("Ultra lent", "3s", "ease-in-out"),
        ("Normal", "1s", "cubic-bezier(0.25, 0.46, 0.45, 0.94)")  # Original
    ]
    
    for name, duration, easing in animations:
        print(f"\n⏱️  Application : {name}")
        success = config.update_animation(duration=duration, easing=easing)
        
        if success:
            print(f"   ✅ {name} appliqué")
            print(f"   💡 Déclenchez un changement de compteur pour voir l'effet")
        else:
            print(f"   ❌ Échec")
        
        input("   ⏸️  Appuyez sur ENTRÉE pour continuer...")

def test_preset_themes(config):
    """Test 5 : Thèmes complets"""
    print_separator()
    print("🎭 Test 5 : Thèmes prédefinis")
    print("-" * 60)
    
    themes = {
        "🌙 Mode Nuit": {
            'font': {'family': 'Courier New', 'size': '56px', 'weight': 'normal'},
            'colors': {'text': '#8B00FF', 'shadow': 'rgba(139,0,255,0.6)', 'stroke': '#4B0082'},
            'animation': {'duration': '1.5s', 'easing': 'ease-in-out'},
            'layout': {'paddingLeft': '30px', 'gap': '5px'}
        },
        "🔥 Mode Énergique": {
            'font': {'family': 'Arial', 'size': '80px', 'weight': 'bold'},
            'colors': {'text': '#FF4500', 'shadow': 'rgba(255,69,0,0.9)', 'stroke': '#8B0000'},
            'animation': {'duration': '500ms', 'easing': 'ease-out'},
            'layout': {'paddingLeft': '20px', 'gap': '10px'}
        },
        "💎 Mode Élégant": {
            'font': {'family': 'Times New Roman', 'size': '64px', 'weight': 'normal'},
            'colors': {'text': '#FFD700', 'shadow': 'rgba(255,215,0,0.7)', 'stroke': '#8B7355'},
            'animation': {'duration': '2s', 'easing': 'cubic-bezier(0.25, 0.1, 0.25, 1)'},
            'layout': {'paddingLeft': '40px', 'gap': '2px'}
        },
        "✨ Mode Classique (Original)": {
            'font': {'family': 'SEA', 'size': '64px', 'weight': 'normal'},
            'colors': {'text': 'white', 'shadow': 'rgba(0,0,0,0.5)', 'stroke': 'black'},
            'animation': {'duration': '1s', 'easing': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'},
            'layout': {'paddingLeft': '20px', 'gap': '0'}
        }
    }
    
    for theme_name, theme_config in themes.items():
        print(f"\n{theme_name}")
        success = config.update_full_config(**theme_config)
        
        if success:
            print(f"   ✅ Thème appliqué")
        else:
            print(f"   ❌ Échec")
        
        time.sleep(3)

def main():
    """Programme principal"""
    print("\n" + "="*60)
    print("  🎨 TEST SYSTÈME CONFIGURATION DYNAMIQUE OVERLAYS")
    print("="*60)
    
    print("\n💡 Assurez-vous que :")
    print("   1. Le serveur Node.js est démarré (depuis OBS)")
    print("   2. Un overlay est chargé dans OBS (subgoal_left_dynamic.html)")
    print("   3. La console du navigateur est ouverte (F12 sur la source)")
    
    input("\n⏸️  Appuyez sur ENTRÉE pour commencer les tests...")
    
    # Test 1 : Connexion
    config = test_connection()
    if not config:
        print("\n❌ Tests interrompus : serveur non accessible")
        return
    
    input("\n⏸️  Appuyez sur ENTRÉE pour continuer...")
    
    # Test 2 : Police
    test_font_change(config)
    
    input("\n⏸️  Appuyez sur ENTRÉE pour continuer...")
    
    # Test 3 : Couleurs
    test_color_change(config)
    
    input("\n⏸️  Appuyez sur ENTRÉE pour continuer...")
    
    # Test 4 : Animation
    test_animation_change(config)
    
    # Test 5 : Thèmes
    test_preset_themes(config)
    
    print_separator()
    print("✅ Tous les tests terminés !")
    print("\n💡 La configuration finale est celle du 'Mode Classique'")
    print("   Tous les paramètres sont revenus à leur valeur d'origine")
    print("\n📚 Consultez docs/CONFIGURATION_DYNAMIQUE.md pour plus d'infos")
    print_separator()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrompus par l'utilisateur")
    except Exception as e:
        print(f"\n\n❌ Erreur : {e}")
        import traceback
        traceback.print_exc()
