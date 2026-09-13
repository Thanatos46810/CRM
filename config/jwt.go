package config

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func getSecretKey() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "chave_fallback_desenvolvimento"
	}
	return []byte(secret)
}

func GerarToken(usuarioID uint) (string, error) {
	claims := jwt.MapClaims{
		"usuario_id": usuarioID,
		"exp":        time.Now().Add(time.Hour * 72).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(getSecretKey())
}

func ValidarToken(tokenString string) (jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("método de assinatura inválido")
		}
		return getSecretKey(), nil
	})

	if err != nil || !token.Valid {
		return nil, errors.New("token inválido")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("erro ao ler dados do token")
	}

	return claims, nil
}
